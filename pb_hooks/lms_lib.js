/// <reference path="../pb_data/types.d.ts" />
// Shared server-side logic for Phase 2 (quizzes, assignments, notifications).
// Loaded inside hook handlers with: require(`${__hooks}/lms_lib.js`)
// Every function receives `app` so it works both in routes ($app) and in event hooks (e.app).

function json(rec, field, fallback) {
  const s = rec.getString(field);
  if (!s) return fallback;
  try {
    const v = JSON.parse(s);
    return v === null || v === undefined ? fallback : v;
  } catch (_) {
    return fallback;
  }
}

function ms(rec, field) {
  const s = rec.getString(field);
  return s ? Date.parse(s.replace(" ", "T")) || 0 : 0;
}

function pbDate(msValue) {
  return new Date(msValue).toISOString().replace("T", " ");
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function slice(goSlice) {
  const out = [];
  if (!goSlice) return out;
  for (let i = 0; i < goSlice.length; i++) out.push(goSlice[i]);
  return out;
}

function perms(app, user) {
  try {
    return slice(app.findRecordById("roles", user.getString("role")).getStringSlice("permissions"));
  } catch (_) {
    return [];
  }
}

function isStaff(app, user, course) {
  if (!user || !course) return false;
  const p = perms(app, user);
  if (p.indexOf("courses.manage_all") >= 0) return true;
  if (p.indexOf("courses.teach") < 0) return false;
  if (course.getString("owner") === user.id) return true;
  return slice(course.getStringSlice("instructors")).indexOf(user.id) >= 0;
}

function activeEnrollment(app, userId, courseId) {
  try {
    return app.findFirstRecordByFilter("enrollments", "user = {:u} && course = {:c} && status = 'active'", { u: userId, c: courseId });
  } catch (_) {
    return null;
  }
}

function activityVisible(app, activity) {
  if (!activity.getBool("is_published")) return false;
  try {
    if (!app.findRecordById("course_sections", activity.getString("section")).getBool("is_published")) return false;
    return app.findRecordById("courses", activity.getString("course")).getString("status") !== "draft";
  } catch (_) {
    return false;
  }
}

function staffIds(course) {
  const ids = slice(course.getStringSlice("instructors"));
  const owner = course.getString("owner");
  if (owner && ids.indexOf(owner) === -1) ids.push(owner);
  return ids;
}

/** Creates an in-app notification. Returns false when the dedupe key already exists. */
function notify(app, userId, n) {
  try {
    if (n.key) {
      try {
        app.findFirstRecordByFilter("notifications", "user = {:u} && dedupe_key = {:k}", { u: userId, k: n.key });
        return false;
      } catch (_) {}
    }
    const r = new Record(app.findCollectionByNameOrId("notifications"));
    r.set("user", userId);
    r.set("type", n.type);
    r.set("title", String(n.title || "").slice(0, 200));
    r.set("body", String(n.body || "").slice(0, 1000));
    r.set("link", String(n.link || "").slice(0, 300));
    if (n.course) r.set("course", n.course);
    r.set("read", false);
    r.set("dedupe_key", String(n.key || "").slice(0, 200));
    app.save(r);
    return true;
  } catch (err) {
    app.logger().warn("Notification failed", "error", String(err), "user", userId);
    return false;
  }
}

function audit(app, actor, action, type, id, desc) {
  try {
    const l = new Record(app.findCollectionByNameOrId("activity_log"));
    if (actor) l.set("actor", actor);
    l.set("action", action);
    l.set("target_type", type);
    l.set("target_id", id);
    l.set("description", String(desc).slice(0, 500));
    app.save(l);
  } catch (err) {
    app.logger().warn("Audit failed", "error", String(err));
  }
}

/** Server-trusted completion (students cannot set quiz/assignment completion themselves). Only ever sets true. */
function markComplete(app, userId, activity) {
  let p = null;
  try {
    p = app.findFirstRecordByFilter("activity_progress", "user = {:u} && activity = {:a}", { u: userId, a: activity.id });
  } catch (_) {}
  if (p && p.getBool("completed")) return;
  if (!p) {
    p = new Record(app.findCollectionByNameOrId("activity_progress"));
    p.set("user", userId);
    p.set("course", activity.getString("course"));
    p.set("activity", activity.id);
    p.set("first_accessed", new DateTime());
    p.set("view_count", 1);
  }
  p.set("completed", true);
  p.set("completed_at", new DateTime());
  p.set("last_accessed", new DateTime());
  app.save(p);
  audit(app, userId, "activity.completed", "activity", activity.id, "Completed " + activity.getString("type") + " " + activity.getString("title"));
}

// ---------------- Quizzes ----------------

function quizClosed(quiz) {
  const until = ms(quiz, "available_until");
  return until > 0 && Date.now() > until;
}

function resultsVisible(quiz) {
  const m = quiz.getString("show_results") || "immediately";
  if (m === "immediately") return true;
  if (m === "after_close") return quizClosed(quiz);
  return false;
}

function buildLayout(app, quiz) {
  const links = app.findRecordsByFilter("quiz_questions", "quiz = {:q}", "sort_order,created", 0, 0, { q: quiz.id });
  const items = [];
  for (let i = 0; i < links.length; i++) {
    let q;
    try { q = app.findRecordById("questions", links[i].getString("question")); } catch (_) { continue; }
    const choices = json(q, "choices", []).map((c) => c.id);
    if (quiz.getBool("shuffle_choices") && q.getString("type") === "multiple_choice") shuffle(choices);
    const points = links[i].getFloat("points") || q.getFloat("points") || 1;
    items.push({ q: q.id, points: points, choices: choices });
  }
  if (quiz.getBool("shuffle_questions")) shuffle(items);
  return items;
}

function norm(s, caseSensitive) {
  const v = String(s === null || s === undefined ? "" : s).trim().replace(/\s+/g, " ");
  return caseSensitive ? v : v.toLowerCase();
}

/** Grades one answer. Short answers that don't match an accepted answer go to manual review. */
function gradeAnswer(q, answer, points) {
  const type = q.getString("type");
  if (type === "multiple_choice") {
    const key = json(q, "answer", []);
    const given = Array.isArray(answer) ? answer : answer ? [answer] : [];
    const ok = key.length > 0 && key.length === given.length && key.every((k) => given.indexOf(k) >= 0);
    return { is_correct: ok, points_awarded: ok ? points : 0, needs_review: false };
  }
  if (type === "true_false") {
    const ok = answer !== null && answer !== undefined && String(answer) === String(json(q, "answer", ""));
    return { is_correct: ok, points_awarded: ok ? points : 0, needs_review: false };
  }
  const text = norm(answer, q.getBool("case_sensitive"));
  if (!text) return { is_correct: false, points_awarded: 0, needs_review: false };
  const accepted = json(q, "answer", []).map((a) => norm(a, q.getBool("case_sensitive")));
  if (accepted.indexOf(text) >= 0) return { is_correct: true, points_awarded: points, needs_review: false };
  return { is_correct: false, points_awarded: 0, needs_review: true };
}

function responseFor(app, attempt, questionId) {
  try {
    return app.findFirstRecordByFilter("quiz_responses", "attempt = {:a} && question = {:q}", { a: attempt.id, q: questionId });
  } catch (_) {
    const r = new Record(app.findCollectionByNameOrId("quiz_responses"));
    r.set("attempt", attempt.id);
    r.set("question", questionId);
    r.set("course", attempt.getString("course"));
    r.set("user", attempt.getString("user"));
    return r;
  }
}

function afterAttemptChange(app, attempt, quiz) {
  const activity = app.findRecordById("activities", attempt.getString("activity"));
  const userId = attempt.getString("user");
  const course = attempt.getString("course");
  const status = attempt.getString("status");
  const mode = activity.getString("completion_mode");
  if (mode === "submit" && status !== "in_progress") markComplete(app, userId, activity);
  if (mode === "pass" && status === "graded" && attempt.getBool("passed")) markComplete(app, userId, activity);

  const link = "/learn/courses/" + course + "/play/" + activity.id;
  const title = activity.getString("title");
  if (status === "graded") {
    if (resultsVisible(quiz)) {
      notify(app, userId, {
        type: "quiz_result", course: course, link: link, key: "quiz_result:" + attempt.id,
        title: "Quiz result: " + title,
        body: "You scored " + attempt.getFloat("percent") + "%" + (attempt.getBool("passed") ? " and passed." : "."),
      });
    } else {
      notify(app, userId, { type: "quiz_result", course: course, link: link, key: "quiz_submitted:" + attempt.id, title: "Quiz submitted: " + title, body: "Your attempt was recorded. Results will be shown when your instructor releases them." });
    }
  } else if (status === "needs_grading") {
    notify(app, userId, { type: "quiz_result", course: course, link: link, key: "quiz_submitted:" + attempt.id, title: "Quiz submitted: " + title, body: "Some answers need instructor review. You'll be notified when grading is complete." });
    try {
      const c = app.findRecordById("courses", course);
      const ids = staffIds(c);
      for (let i = 0; i < ids.length; i++) {
        notify(app, ids[i], { type: "grading_needed", course: course, key: "grading_attempt:" + attempt.id, link: "/teach/grading", title: "Quiz answers to review: " + title, body: "A short-answer response needs manual grading." });
      }
    } catch (_) {}
  }
}

/** Recomputes an attempt's totals from its responses (used after manual grading). */
function recomputeAttempt(app, attempt) {
  const quiz = app.findRecordById("quizzes", attempt.getString("quiz"));
  const layout = json(attempt, "layout", []);
  let max = 0;
  for (let i = 0; i < layout.length; i++) max += Number(layout[i].points) || 0;
  const rs = app.findRecordsByFilter("quiz_responses", "attempt = {:a}", "", 0, 0, { a: attempt.id });
  let score = 0;
  let review = false;
  for (let i = 0; i < rs.length; i++) {
    score += rs[i].getFloat("points_awarded");
    if (rs[i].getBool("needs_review")) review = true;
  }
  const percent = max > 0 ? Math.round((score * 10000) / max) / 100 : 0;
  attempt.set("score", score);
  attempt.set("max_score", max);
  attempt.set("percent", Math.min(100, percent));
  attempt.set("status", review ? "needs_grading" : "graded");
  attempt.set("passed", !review && percent >= quiz.getFloat("passing_score"));
  app.save(attempt);
  afterAttemptChange(app, attempt, quiz);
  return attempt;
}

/** Grades and closes an in-progress attempt using the answers saved so far. */
function finalizeAttempt(app, attempt, auto) {
  if (attempt.getString("status") !== "in_progress") return attempt;
  const layout = json(attempt, "layout", []);
  for (let i = 0; i < layout.length; i++) {
    let q;
    try { q = app.findRecordById("questions", layout[i].q); } catch (_) { continue; }
    const resp = responseFor(app, attempt, q.id);
    const g = gradeAnswer(q, json(resp, "answer", null), Number(layout[i].points) || 0);
    resp.set("is_correct", g.is_correct);
    resp.set("points_awarded", g.points_awarded);
    resp.set("points_possible", Number(layout[i].points) || 0);
    resp.set("needs_review", g.needs_review);
    app.save(resp);
  }
  attempt.set("submitted_at", new DateTime());
  attempt.set("auto_submitted", !!auto);
  return recomputeAttempt(app, attempt);
}

/** Auto-submits attempts whose timer (plus 30 s grace) or availability window has passed. */
function expireIfNeeded(app, attempt) {
  if (attempt.getString("status") !== "in_progress") return attempt;
  const deadline = ms(attempt, "deadline");
  const quiz = app.findRecordById("quizzes", attempt.getString("quiz"));
  const timedOut = deadline > 0 && Date.now() > deadline + 30000;
  if (timedOut || quizClosed(quiz)) return finalizeAttempt(app, attempt, true);
  return attempt;
}

/** Student-facing attempt payload. Answer keys only when allowed by quiz settings (or for staff). */
function attemptPayload(app, attempt, quiz, forStaff) {
  const status = attempt.getString("status");
  const showResults = forStaff || (status !== "in_progress" && resultsVisible(quiz));
  const showKey = forStaff || (showResults && quiz.getBool("show_correct_answers"));
  const rs = app.findRecordsByFilter("quiz_responses", "attempt = {:a}", "", 0, 0, { a: attempt.id });
  const byQ = {};
  for (let i = 0; i < rs.length; i++) byQ[rs[i].getString("question")] = rs[i];
  const layout = json(attempt, "layout", []);
  const questions = [];
  for (let i = 0; i < layout.length; i++) {
    const it = layout[i];
    let q = null;
    try { q = app.findRecordById("questions", it.q); } catch (_) {}
    const all = q ? json(q, "choices", []) : [];
    const text = {};
    for (let j = 0; j < all.length; j++) text[all[j].id] = all[j].text;
    const resp = byQ[it.q];
    const out = {
      id: it.q,
      type: q ? q.getString("type") : "removed",
      prompt: q ? q.getString("prompt") : "(This question was removed from the bank.)",
      points: Number(it.points) || 0,
      multiple: q ? q.getBool("multiple") : false,
      choices: (it.choices || []).filter((cid) => text[cid] !== undefined).map((cid) => ({ id: cid, text: text[cid] })),
      answer: resp ? json(resp, "answer", null) : null,
    };
    if (showResults && resp) {
      out.response_id = forStaff ? resp.id : undefined;
      out.is_correct = resp.getBool("is_correct");
      out.points_awarded = resp.getFloat("points_awarded");
      out.needs_review = resp.getBool("needs_review");
      out.grader_feedback = resp.getString("feedback");
    }
    if (showKey && q) {
      out.correct = json(q, "answer", null);
      out.explanation = q.getString("feedback");
    }
    questions.push(out);
  }
  const a = {
    id: attempt.id,
    attempt_number: attempt.getInt("attempt_number"),
    status: status,
    started_at: attempt.getString("started_at"),
    deadline: attempt.getString("deadline"),
    submitted_at: attempt.getString("submitted_at"),
    auto_submitted: attempt.getBool("auto_submitted"),
  };
  if (showResults) {
    a.score = attempt.getFloat("score");
    a.max_score = attempt.getFloat("max_score");
    a.percent = attempt.getFloat("percent");
    a.passed = attempt.getBool("passed");
  }
  return { attempt: a, results_visible: showResults, key_visible: showKey, questions: questions, server_time: new Date().toISOString() };
}

/** Validates and normalises a submitted answer against the attempt layout. */
function cleanAnswer(q, item, answer) {
  const type = q.getString("type");
  if (type === "multiple_choice") {
    const allowed = item.choices || [];
    const list = (Array.isArray(answer) ? answer : answer ? [answer] : []).map(String).filter((x) => allowed.indexOf(x) >= 0);
    return q.getBool("multiple") ? list : list.slice(0, 1);
  }
  if (type === "true_false") return answer === "true" || answer === true ? "true" : answer === "false" || answer === false ? "false" : null;
  return String(answer === null || answer === undefined ? "" : answer).slice(0, 5000);
}

/**
 * Resolves an activity for the signed-in user and enforces access:
 * course staff always; students only when actively enrolled and the activity is visible.
 * Returns { error } (404 to avoid leaking existence) or { activity, course, staff, enrollment }.
 */
function activityContext(app, auth, activityId, type) {
  let activity;
  try { activity = app.findRecordById("activities", activityId); } catch (_) { return { error: 404 }; }
  if (type && activity.getString("type") !== type) return { error: 404 };
  const course = app.findRecordById("courses", activity.getString("course"));
  const staff = isStaff(app, auth, course);
  const enrollment = staff ? null : activeEnrollment(app, auth.id, course.id);
  if (!staff && (!enrollment || !activityVisible(app, activity))) return { error: 404 };
  return { activity: activity, course: course, staff: staff, enrollment: enrollment };
}

function extOf(name) {
  const n = String(name || "");
  return n.indexOf(".") >= 0 ? n.split(".").pop().toLowerCase() : "";
}

module.exports = {
  json, ms, pbDate, slice, perms, isStaff, activeEnrollment, activityVisible, staffIds, notify, audit, markComplete,
  quizClosed, resultsVisible, buildLayout, gradeAnswer, finalizeAttempt, recomputeAttempt, expireIfNeeded,
  attemptPayload, cleanAnswer, responseFor, afterAttemptChange, activityContext, extOf,
};
