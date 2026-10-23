/// <reference path="../pb_data/types.d.ts" />
// Phase 2: quizzes, assignments, grading, announcements, discussions, notifications.
// Shared logic lives in lms_lib.js (loaded inside each handler).

// =====================================================================
// QUIZZES
// =====================================================================

// Quiz overview for the current user: settings, own attempts (results per visibility), whether a new attempt can start.
routerAdd("GET", "/api/lms/quizzes/{activityId}/summary", (e) => {
  const lib = require(`${__hooks}/lms_lib.js`);
  const ctx = lib.activityContext($app, e.auth, e.request.pathValue("activityId"), "quiz");
  if (ctx.error) return e.json(404, { message: "Quiz not found." });
  let quiz;
  try { quiz = $app.findFirstRecordByFilter("quizzes", "activity = {:a}", { a: ctx.activity.id }); } catch (_) { return e.json(404, { message: "This quiz hasn't been configured yet." }); }
  const links = $app.findRecordsByFilter("quiz_questions", "quiz = {:q}", "", 0, 0, { q: quiz.id });
  let totalPoints = 0;
  for (let i = 0; i < links.length; i++) {
    let p = links[i].getFloat("points");
    if (!p) { try { p = $app.findRecordById("questions", links[i].getString("question")).getFloat("points") || 1; } catch (_) { p = 0; } }
    totalPoints += p;
  }
  const visible = lib.resultsVisible(quiz);
  const own = $app.findRecordsByFilter("quiz_attempts", "quiz = {:q} && user = {:u}", "attempt_number", 0, 0, { q: quiz.id, u: e.auth.id });
  const attempts = [];
  let inProgress = "";
  let best = null;
  for (let i = 0; i < own.length; i++) {
    const a = lib.expireIfNeeded($app, own[i]);
    const row = { id: a.id, attempt_number: a.getInt("attempt_number"), status: a.getString("status"), started_at: a.getString("started_at"), submitted_at: a.getString("submitted_at"), auto_submitted: a.getBool("auto_submitted") };
    if (a.getString("status") === "in_progress") inProgress = a.id;
    if (visible && a.getString("status") !== "in_progress") {
      row.score = a.getFloat("score"); row.max_score = a.getFloat("max_score"); row.percent = a.getFloat("percent"); row.passed = a.getBool("passed");
      if (a.getString("status") === "graded" && (best === null || row.percent > best)) best = row.percent;
    }
    attempts.push(row);
  }
  const now = Date.now();
  const from = lib.ms(quiz, "available_from");
  const closed = lib.quizClosed(quiz);
  const notYet = from > 0 && now < from;
  const max = quiz.getInt("max_attempts");
  const left = max > 0 ? Math.max(0, max - own.length) : null;
  let reason = "";
  if (ctx.staff) reason = "Staff preview: attempts are only recorded for enrolled students.";
  else if (!links.length) reason = "This quiz has no questions yet.";
  else if (notYet) reason = "This quiz opens later.";
  else if (closed && !inProgress) reason = "This quiz is closed.";
  else if (!inProgress && left === 0) reason = "You have used all your attempts.";
  return e.json(200, {
    quiz: {
      id: quiz.id, time_limit_minutes: quiz.getInt("time_limit_minutes"), max_attempts: max, passing_score: quiz.getFloat("passing_score"),
      available_from: quiz.getString("available_from"), available_until: quiz.getString("available_until"),
      show_results: quiz.getString("show_results") || "immediately", show_correct_answers: quiz.getBool("show_correct_answers"),
    },
    question_count: links.length, total_points: totalPoints, attempts: attempts, in_progress_id: inProgress,
    attempts_left: left, can_start: !reason, reason: reason, results_visible: visible, best_percent: best, is_staff: ctx.staff,
  });
}, $apis.requireAuth("users"));

// Starts a new attempt, or resumes the current one. Question order and choice order are fixed server-side.
routerAdd("POST", "/api/lms/quizzes/{activityId}/start", (e) => {
  const lib = require(`${__hooks}/lms_lib.js`);
  const ctx = lib.activityContext($app, e.auth, e.request.pathValue("activityId"), "quiz");
  if (ctx.error) return e.json(404, { message: "Quiz not found." });
  if (ctx.staff) return e.json(403, { message: "Attempts are only recorded for enrolled students." });
  let quiz;
  try { quiz = $app.findFirstRecordByFilter("quizzes", "activity = {:a}", { a: ctx.activity.id }); } catch (_) { return e.json(404, { message: "This quiz hasn't been configured yet." }); }

  const own = $app.findRecordsByFilter("quiz_attempts", "quiz = {:q} && user = {:u}", "attempt_number", 0, 0, { q: quiz.id, u: e.auth.id });
  for (let i = 0; i < own.length; i++) {
    const a = lib.expireIfNeeded($app, own[i]);
    if (a.getString("status") === "in_progress") return e.json(200, lib.attemptPayload($app, a, quiz, false));
  }
  const now = Date.now();
  const from = lib.ms(quiz, "available_from");
  if (from > 0 && now < from) return e.json(400, { message: "This quiz isn't open yet." });
  if (lib.quizClosed(quiz)) return e.json(400, { message: "This quiz is closed." });
  const max = quiz.getInt("max_attempts");
  if (max > 0 && own.length >= max) return e.json(400, { message: "You have used all your attempts for this quiz." });
  const layout = lib.buildLayout($app, quiz);
  if (!layout.length) return e.json(400, { message: "This quiz has no questions yet." });

  const attempt = new Record($app.findCollectionByNameOrId("quiz_attempts"));
  attempt.set("quiz", quiz.id);
  attempt.set("activity", ctx.activity.id);
  attempt.set("course", ctx.course.id);
  attempt.set("user", e.auth.id);
  attempt.set("attempt_number", own.length + 1);
  attempt.set("status", "in_progress");
  attempt.set("started_at", lib.pbDate(now));
  const limit = quiz.getInt("time_limit_minutes");
  let deadline = limit > 0 ? now + limit * 60000 : 0;
  const until = lib.ms(quiz, "available_until");
  if (until > 0 && (deadline === 0 || until < deadline)) deadline = until;
  if (deadline > 0) attempt.set("deadline", lib.pbDate(deadline));
  attempt.set("layout", layout);
  attempt.set("score", 0);
  try {
    $app.save(attempt);
  } catch (err) {
    // Concurrent start (unique quiz+user+attempt_number): return the attempt that won.
    try {
      const existing = $app.findFirstRecordByFilter("quiz_attempts", "quiz = {:q} && user = {:u} && status = 'in_progress'", { q: quiz.id, u: e.auth.id });
      return e.json(200, lib.attemptPayload($app, existing, quiz, false));
    } catch (_) {
      return e.json(409, { message: "Could not start the attempt. Please try again." });
    }
  }
  lib.audit($app, e.auth.id, "quiz.started", "activity", ctx.activity.id, "Started attempt " + (own.length + 1) + " of " + ctx.activity.getString("title"));
  return e.json(200, lib.attemptPayload($app, attempt, quiz, false));
}, $apis.requireAuth("users"));

// Reads an attempt: the owner (redacted per settings) or course staff (with answer key).
routerAdd("GET", "/api/lms/quiz-attempts/{attemptId}", (e) => {
  const lib = require(`${__hooks}/lms_lib.js`);
  let attempt;
  try { attempt = $app.findRecordById("quiz_attempts", e.request.pathValue("attemptId")); } catch (_) { return e.json(404, { message: "Attempt not found." }); }
  const course = $app.findRecordById("courses", attempt.getString("course"));
  const staff = lib.isStaff($app, e.auth, course);
  if (!staff && attempt.getString("user") !== e.auth.id) return e.json(404, { message: "Attempt not found." });
  attempt = lib.expireIfNeeded($app, attempt);
  const quiz = $app.findRecordById("quizzes", attempt.getString("quiz"));
  const payload = lib.attemptPayload($app, attempt, quiz, staff);
  if (staff) {
    try { const u = $app.findRecordById("users", attempt.getString("user")); payload.student = { id: u.id, name: u.getString("name") || u.email() }; } catch (_) {}
    payload.activity = { id: attempt.getString("activity") };
  }
  return e.json(200, payload);
}, $apis.requireAuth("users"));

// Autosaves answers for the owner's in-progress attempt. Rejected once time is up.
routerAdd("POST", "/api/lms/quiz-attempts/{attemptId}/answer", (e) => {
  const lib = require(`${__hooks}/lms_lib.js`);
  let attempt;
  try { attempt = $app.findRecordById("quiz_attempts", e.request.pathValue("attemptId")); } catch (_) { return e.json(404, { message: "Attempt not found." }); }
  if (attempt.getString("user") !== e.auth.id) return e.json(404, { message: "Attempt not found." });
  if (!lib.activeEnrollment($app, e.auth.id, attempt.getString("course"))) return e.json(403, { message: "Your enrollment is not active." });
  attempt = lib.expireIfNeeded($app, attempt);
  if (attempt.getString("status") !== "in_progress") return e.json(409, { message: "Time is up. Your attempt was submitted automatically.", submitted: true });
  const answers = (e.requestInfo().body || {}).answers || {};
  const layout = lib.json(attempt, "layout", []);
  let saved = 0;
  for (let i = 0; i < layout.length; i++) {
    const qid = layout[i].q;
    if (!Object.prototype.hasOwnProperty.call(answers, qid)) continue;
    let q;
    try { q = $app.findRecordById("questions", qid); } catch (_) { continue; }
    const resp = lib.responseFor($app, attempt, qid);
    resp.set("answer", lib.cleanAnswer(q, layout[i], answers[qid]));
    resp.set("points_possible", Number(layout[i].points) || 0);
    $app.save(resp);
    saved++;
  }
  return e.json(200, { saved: saved, server_time: new Date().toISOString() });
}, $apis.requireAuth("users"));

// Submits (and grades) the owner's attempt. Answers sent with the request are saved first if time remains.
routerAdd("POST", "/api/lms/quiz-attempts/{attemptId}/submit", (e) => {
  const lib = require(`${__hooks}/lms_lib.js`);
  let attempt;
  try { attempt = $app.findRecordById("quiz_attempts", e.request.pathValue("attemptId")); } catch (_) { return e.json(404, { message: "Attempt not found." }); }
  if (attempt.getString("user") !== e.auth.id) return e.json(404, { message: "Attempt not found." });
  attempt = lib.expireIfNeeded($app, attempt);
  const quiz = $app.findRecordById("quizzes", attempt.getString("quiz"));
  if (attempt.getString("status") === "in_progress") {
    const answers = (e.requestInfo().body || {}).answers || {};
    const layout = lib.json(attempt, "layout", []);
    for (let i = 0; i < layout.length; i++) {
      const qid = layout[i].q;
      if (!Object.prototype.hasOwnProperty.call(answers, qid)) continue;
      let q;
      try { q = $app.findRecordById("questions", qid); } catch (_) { continue; }
      const resp = lib.responseFor($app, attempt, qid);
      resp.set("answer", lib.cleanAnswer(q, layout[i], answers[qid]));
      $app.save(resp);
    }
    attempt = lib.finalizeAttempt($app, attempt, false);
    lib.audit($app, e.auth.id, "quiz.submitted", "activity", attempt.getString("activity"), "Submitted quiz attempt " + attempt.getInt("attempt_number"));
  }
  return e.json(200, lib.attemptPayload($app, attempt, quiz, false));
}, $apis.requireAuth("users"));

// Staff: manually grade a response (typically short answers) and recompute the attempt.
routerAdd("POST", "/api/lms/quiz-responses/{responseId}/grade", (e) => {
  const lib = require(`${__hooks}/lms_lib.js`);
  let resp;
  try { resp = $app.findRecordById("quiz_responses", e.request.pathValue("responseId")); } catch (_) { return e.json(404, { message: "Response not found." }); }
  const course = $app.findRecordById("courses", resp.getString("course"));
  if (!lib.isStaff($app, e.auth, course)) return e.json(404, { message: "Response not found." });
  const attempt = $app.findRecordById("quiz_attempts", resp.getString("attempt"));
  if (attempt.getString("status") === "in_progress") return e.json(400, { message: "The attempt hasn't been submitted yet." });
  const body = e.requestInfo().body || {};
  const points = Number(body.points);
  const possible = resp.getFloat("points_possible");
  if (!isFinite(points) || points < 0 || points > possible) return e.json(400, { message: "Points must be between 0 and " + possible + "." });
  resp.set("points_awarded", points);
  resp.set("is_correct", points >= possible && possible > 0);
  resp.set("needs_review", false);
  resp.set("feedback", String(body.feedback || "").slice(0, 2000));
  resp.set("graded_by", e.auth.id);
  resp.set("graded_at", new DateTime());
  $app.save(resp);
  const updated = lib.recomputeAttempt($app, attempt);
  lib.audit($app, e.auth.id, "quiz.graded", "quiz_attempt", attempt.id, "Graded a response (" + points + "/" + possible + ")");
  const quiz = $app.findRecordById("quizzes", updated.getString("quiz"));
  return e.json(200, lib.attemptPayload($app, updated, quiz, true));
}, $apis.requireAuth("users"));

// =====================================================================
// ASSIGNMENTS
// =====================================================================

// Student submission (multipart: text + files). All limits are enforced here; the collection itself is write-locked.
routerAdd("POST", "/api/lms/assignments/{activityId}/submit", (e) => {
  const lib = require(`${__hooks}/lms_lib.js`);
  const ctx = lib.activityContext($app, e.auth, e.request.pathValue("activityId"), "assignment");
  if (ctx.error) return e.json(404, { message: "Assignment not found." });
  if (ctx.staff) return e.json(403, { message: "Only enrolled students can submit." });
  let asg;
  try { asg = $app.findFirstRecordByFilter("assignments", "activity = {:a}", { a: ctx.activity.id }); } catch (_) { return e.json(404, { message: "This assignment hasn't been configured yet." }); }

  const now = Date.now();
  const due = lib.ms(asg, "due_at");
  const cutoff = lib.ms(asg, "cutoff_at");
  if (cutoff > 0 && now > cutoff) return e.json(400, { message: "Submissions for this assignment are closed." });
  const late = due > 0 && now > due;
  if (late && !asg.getBool("allow_late")) return e.json(400, { message: "The due date has passed and late submissions aren't accepted." });

  const previous = $app.findRecordsByFilter("submissions", "assignment = {:s} && user = {:u}", "-number", 0, 0, { s: asg.id, u: e.auth.id });
  const maxSubs = asg.getInt("max_submissions");
  if (maxSubs > 0 && previous.length >= maxSubs) return e.json(400, { message: "You have reached the maximum number of submissions (" + maxSubs + ")." });

  const text = String((e.requestInfo().body || {}).text || "").trim().slice(0, 20000);
  let files = [];
  try { files = e.findUploadedFiles("files") || []; } catch (_) { files = []; }
  const type = asg.getString("submission_type") || "text_and_file";
  if (type === "text" && !text) return e.json(400, { message: "Please enter your answer text." });
  if (type === "text" && files.length) return e.json(400, { message: "This assignment accepts text only." });
  if (type === "file" && !files.length) return e.json(400, { message: "Please attach at least one file." });
  if (type === "text_and_file" && !text && !files.length) return e.json(400, { message: "Add text or attach at least one file." });

  const maxFiles = asg.getInt("max_files") || 1;
  if (files.length > maxFiles) return e.json(400, { message: "You can attach at most " + maxFiles + " file(s)." });
  const maxBytes = (asg.getInt("max_file_mb") || 10) * 1024 * 1024;
  const globalAllowed = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "odp", "ods", "rtf", "txt", "csv", "png", "jpg", "jpeg", "gif", "webp", "zip"];
  const configured = String(asg.getString("allowed_extensions") || "").toLowerCase().split(/[\s,;.]+/).filter((x) => x);
  const allowed = configured.length ? configured.filter((x) => globalAllowed.indexOf(x) >= 0) : globalAllowed;
  const meta = [];
  for (let i = 0; i < files.length; i++) {
    const name = String(files[i].originalName || files[i].name || "");
    const ext = lib.extOf(name);
    if (allowed.indexOf(ext) === -1) return e.json(400, { message: "\"" + name + "\" is not an allowed file type. Allowed: " + allowed.join(", ") + "." });
    if (files[i].size > maxBytes) return e.json(400, { message: "\"" + name + "\" is larger than " + (maxBytes / 1048576) + " MB." });
    meta.push({ name: name.slice(0, 255), size: files[i].size });
  }

  const sub = new Record($app.findCollectionByNameOrId("submissions"));
  sub.set("assignment", asg.id);
  sub.set("activity", ctx.activity.id);
  sub.set("course", ctx.course.id);
  sub.set("user", e.auth.id);
  sub.set("number", previous.length + 1);
  sub.set("text", text);
  if (files.length) sub.set("files", files);
  sub.set("file_meta", meta);
  sub.set("submitted_at", lib.pbDate(now));
  sub.set("is_late", late);
  sub.set("is_latest", true);
  sub.set("status", "submitted");
  try {
    $app.save(sub);
  } catch (err) {
    return e.json(400, { message: "Your submission could not be saved. Check that your files are valid documents or images.", detail: String(err).slice(0, 200) });
  }
  for (let i = 0; i < previous.length; i++) {
    if (previous[i].getBool("is_latest")) { previous[i].set("is_latest", false); $app.save(previous[i]); }
  }
  if (ctx.activity.getString("completion_mode") === "submit") lib.markComplete($app, e.auth.id, ctx.activity);
  const who = e.auth.getString("name") || e.auth.email();
  const ids = lib.staffIds(ctx.course);
  for (let i = 0; i < ids.length; i++) {
    lib.notify($app, ids[i], { type: "submission_received", course: ctx.course.id, key: "submission:" + sub.id, link: "/teach/grading",
      title: "New submission: " + ctx.activity.getString("title"), body: who + (previous.length ? " resubmitted" : " submitted") + (late ? " (late)." : ".") });
  }
  lib.audit($app, e.auth.id, "assignment.submitted", "activity", ctx.activity.id, (previous.length ? "Resubmitted " : "Submitted ") + ctx.activity.getString("title") + (late ? " (late)" : ""));
  return e.json(200, sub);
}, $apis.requireAuth("users"));

// Staff: grade a submission and leave feedback.
routerAdd("POST", "/api/lms/submissions/{id}/grade", (e) => {
  const lib = require(`${__hooks}/lms_lib.js`);
  let sub;
  try { sub = $app.findRecordById("submissions", e.request.pathValue("id")); } catch (_) { return e.json(404, { message: "Submission not found." }); }
  const course = $app.findRecordById("courses", sub.getString("course"));
  if (!lib.isStaff($app, e.auth, course)) return e.json(404, { message: "Submission not found." });
  const asg = $app.findRecordById("assignments", sub.getString("assignment"));
  const body = e.requestInfo().body || {};
  const grade = Number(body.grade);
  const max = asg.getFloat("max_marks");
  if (!isFinite(grade) || grade < 0 || (max > 0 && grade > max)) return e.json(400, { message: "Grade must be between 0 and " + max + "." });
  sub.set("grade", grade);
  sub.set("feedback", String(body.feedback || "").slice(0, 5000));
  sub.set("status", "graded");
  sub.set("graded_by", e.auth.id);
  sub.set("graded_at", new DateTime());
  $app.save(sub);
  const activity = $app.findRecordById("activities", sub.getString("activity"));
  const pass = asg.getFloat("pass_marks");
  if (activity.getString("completion_mode") === "pass" && grade >= pass) lib.markComplete($app, sub.getString("user"), activity);
  lib.notify($app, sub.getString("user"), {
    type: "assignment_graded", course: course.id, key: "graded:" + sub.id + ":" + grade,
    link: "/learn/courses/" + course.id + "/play/" + activity.id,
    title: "Assignment graded: " + activity.getString("title"),
    body: "You received " + grade + (max > 0 ? " / " + max : "") + "." + (sub.getString("feedback") ? " Your instructor left feedback." : ""),
  });
  lib.audit($app, e.auth.id, "assignment.graded", "submission", sub.id, "Graded " + activity.getString("title") + " (" + grade + (max > 0 ? "/" + max : "") + ")");
  return e.json(200, sub);
}, $apis.requireAuth("users"));

// =====================================================================
// GRADES
// =====================================================================

// Gradebook. Staff: every active learner × every published quiz/assignment. Students: their own row only.
routerAdd("GET", "/api/lms/grades/{courseId}", (e) => {
  const lib = require(`${__hooks}/lms_lib.js`);
  let course;
  try { course = $app.findRecordById("courses", e.request.pathValue("courseId")); } catch (_) { return e.json(404, { message: "Course not found." }); }
  const staff = lib.isStaff($app, e.auth, course);
  if (!staff && !lib.activeEnrollment($app, e.auth.id, course.id)) return e.json(404, { message: "Course not found." });

  const acts = $app.findRecordsByFilter("activities", "course = {:c} && (type = 'quiz' || type = 'assignment')", "sort_order,created", 0, 0, { c: course.id });
  const sections = $app.findRecordsByFilter("course_sections", "course = {:c}", "sort_order,created", 0, 0, { c: course.id });
  const sectionOrder = {};
  const sectionVisible = {};
  for (let i = 0; i < sections.length; i++) { sectionOrder[sections[i].id] = i; sectionVisible[sections[i].id] = sections[i].getBool("is_published"); }
  const columns = [];
  for (let i = 0; i < acts.length; i++) {
    const a = acts[i];
    if (!staff && (!a.getBool("is_published") || !sectionVisible[a.getString("section")])) continue;
    const col = { activity_id: a.id, title: a.getString("title"), type: a.getString("type"), published: a.getBool("is_published") && !!sectionVisible[a.getString("section")], max: 0, due_at: "", order: (sectionOrder[a.getString("section")] || 0) * 10000 + a.getInt("sort_order") };
    if (a.getString("type") === "quiz") {
      try {
        const qz = $app.findFirstRecordByFilter("quizzes", "activity = {:a}", { a: a.id });
        col.quiz_id = qz.id; col.results_visible = lib.resultsVisible(qz); col.passing = qz.getFloat("passing_score");
      } catch (_) { continue; }
    } else {
      try {
        const asg = $app.findFirstRecordByFilter("assignments", "activity = {:a}", { a: a.id });
        col.assignment_id = asg.id; col.max = asg.getFloat("max_marks"); col.due_at = asg.getString("due_at"); col.passing = asg.getFloat("pass_marks");
      } catch (_) { continue; }
    }
    columns.push(col);
  }
  columns.sort((x, y) => x.order - y.order);

  let learners = [];
  if (staff) {
    const ens = $app.findRecordsByFilter("enrollments", "course = {:c} && status = 'active'", "", 0, 0, { c: course.id });
    for (let i = 0; i < ens.length; i++) {
      try { const u = $app.findRecordById("users", ens[i].getString("user")); learners.push({ id: u.id, name: u.getString("name") || u.email(), email: u.email() }); } catch (_) {}
    }
    learners.sort((x, y) => x.name.localeCompare(y.name));
  } else {
    learners = [{ id: e.auth.id, name: e.auth.getString("name") || e.auth.email(), email: e.auth.email() }];
  }

  const rows = [];
  for (let li = 0; li < learners.length; li++) {
    const L = learners[li];
    const cells = {};
    let earned = 0;
    let possible = 0;
    for (let ci = 0; ci < columns.length; ci++) {
      const col = columns[ci];
      const cell = { status: "none", score: null, max: col.max, percent: null, passed: null, late: false, needs_grading: false };
      if (col.type === "quiz") {
        const atts = $app.findRecordsByFilter("quiz_attempts", "quiz = {:q} && user = {:u}", "attempt_number", 0, 0, { q: col.quiz_id, u: L.id });
        let best = null;
        let pending = false;
        let inprog = false;
        for (let k = 0; k < atts.length; k++) {
          const st = atts[k].getString("status");
          if (st === "graded" && (best === null || atts[k].getFloat("percent") > best.getFloat("percent"))) best = atts[k];
          if (st === "needs_grading") pending = true;
          if (st === "in_progress") inprog = true;
        }
        cell.attempts = atts.length;
        const canSee = staff || col.results_visible;
        if (best && canSee) {
          cell.status = "graded"; cell.score = best.getFloat("score"); cell.max = best.getFloat("max_score"); cell.percent = best.getFloat("percent"); cell.passed = best.getBool("passed");
          earned += cell.score; possible += cell.max;
        } else if (pending) { cell.status = "needs_grading"; cell.needs_grading = true; }
        else if (best || atts.length) cell.status = inprog && !best ? "in_progress" : canSee ? "submitted" : "submitted";
      } else {
        let sub = null;
        try { sub = $app.findFirstRecordByFilter("submissions", "assignment = {:s} && user = {:u} && is_latest = true", { s: col.assignment_id, u: L.id }); } catch (_) {}
        if (sub) {
          cell.late = sub.getBool("is_late");
          cell.submission_id = sub.id;
          if (sub.getString("status") === "graded") {
            cell.status = "graded"; cell.score = sub.getFloat("grade");
            cell.percent = col.max > 0 ? Math.round((cell.score * 10000) / col.max) / 100 : null;
            cell.passed = cell.score >= col.passing;
            earned += cell.score; possible += col.max;
          } else { cell.status = "submitted"; cell.needs_grading = true; }
        } else {
          const due = col.due_at ? Date.parse(col.due_at.replace(" ", "T")) : 0;
          cell.status = due && Date.now() > due ? "missing" : "none";
        }
      }
      cells[col.activity_id] = cell;
    }
    rows.push({ user: L, cells: cells, earned: earned, possible: possible, percent: possible > 0 ? Math.round((earned * 10000) / possible) / 100 : null });
  }
  return e.json(200, { course: { id: course.id, title: course.getString("title") }, is_staff: staff, columns: columns, rows: rows });
}, $apis.requireAuth("users"));

// Grading queue across the courses the user teaches (ungraded submissions + quiz attempts awaiting review).
routerAdd("GET", "/api/lms/grading/queue", (e) => {
  const lib = require(`${__hooks}/lms_lib.js`);
  const perms = lib.perms($app, e.auth);
  const all = perms.indexOf("courses.manage_all") >= 0;
  if (!all && perms.indexOf("courses.teach") < 0) return e.json(403, { message: "Not permitted." });
  const scope = all ? "" : " && (course.owner = {:u} || course.instructors.id ?= {:u})";
  const subs = $app.findRecordsByFilter("submissions", "status = 'submitted' && is_latest = true" + scope, "submitted_at", 200, 0, { u: e.auth.id });
  const atts = $app.findRecordsByFilter("quiz_attempts", "status = 'needs_grading'" + scope, "submitted_at", 200, 0, { u: e.auth.id });
  const cache = {};
  function rec(coll, id) {
    const k = coll + id;
    if (!cache[k]) { try { cache[k] = $app.findRecordById(coll, id); } catch (_) { cache[k] = null; } }
    return cache[k];
  }
  function label(r) {
    const u = rec("users", r.getString("user"));
    const c = rec("courses", r.getString("course"));
    const a = rec("activities", r.getString("activity"));
    return { student: u ? u.getString("name") || u.email() : "Unknown", course_id: r.getString("course"), course: c ? c.getString("title") : "", activity_id: r.getString("activity"), activity: a ? a.getString("title") : "" };
  }
  const items = [];
  for (let i = 0; i < subs.length; i++) items.push(Object.assign({ kind: "submission", id: subs[i].id, submitted_at: subs[i].getString("submitted_at"), late: subs[i].getBool("is_late") }, label(subs[i])));
  for (let i = 0; i < atts.length; i++) items.push(Object.assign({ kind: "quiz_attempt", id: atts[i].id, submitted_at: atts[i].getString("submitted_at"), late: false }, label(atts[i])));
  items.sort((x, y) => (x.submitted_at < y.submitted_at ? -1 : 1));
  return e.json(200, { items: items });
}, $apis.requireAuth("users"));

// =====================================================================
// EVENT HOOKS
// =====================================================================

// Every quiz/assignment activity gets its settings record automatically (so the editor always has one).
onRecordAfterCreateSuccess((e) => {
  e.next();
  const type = e.record.getString("type");
  if (type !== "quiz" && type !== "assignment") return;
  try {
    const coll = type === "quiz" ? "quizzes" : "assignments";
    try { e.app.findFirstRecordByFilter(coll, "activity = {:a}", { a: e.record.id }); return; } catch (_) {}
    const r = new Record(e.app.findCollectionByNameOrId(coll));
    r.set("activity", e.record.id);
    r.set("course", e.record.getString("course"));
    if (type === "quiz") {
      r.set("passing_score", 50);
      r.set("show_results", "immediately");
      r.set("max_attempts", 1);
    } else {
      r.set("max_marks", 100);
      r.set("submission_type", "text_and_file");
      r.set("max_file_mb", 10);
      r.set("max_files", 3);
      r.set("allow_late", true);
    }
    e.app.save(r);
  } catch (err) {
    e.app.logger().error("Activity settings auto-create failed", "error", String(err));
  }
}, "activities");

// Topic defaults.
onRecordCreate((e) => {
  e.record.set("reply_count", 0);
  e.record.set("last_activity_at", new DateTime());
  e.next();
}, "discussion_topics");

onRecordUpdate((e) => {
  const name = e.record.collection().name;
  if (name === "discussion_replies") {
    const prev = e.record.original();
    if (prev.getString("body") !== e.record.getString("body")) e.record.set("edited", true);
  }
  e.next();
}, "discussion_replies");

// Announcements notify every active learner once (dedupe per announcement).
onRecordAfterCreateSuccess((e) => {
  e.next();
  const lib = require(`${__hooks}/lms_lib.js`);
  try {
    const r = e.record;
    if (!r.getBool("published")) return;
    const ens = e.app.findRecordsByFilter("enrollments", "course = {:c} && status = 'active'", "", 0, 0, { c: r.getString("course") });
    for (let i = 0; i < ens.length; i++) {
      lib.notify(e.app, ens[i].getString("user"), { type: "announcement", course: r.getString("course"), key: "announcement:" + r.id,
        link: "/learn/courses/" + r.getString("course") + "/announcements", title: "Announcement: " + r.getString("title"), body: "A new course announcement was posted." });
    }
    lib.audit(e.app, r.getString("author"), "announcement.created", "announcement", r.id, "Posted announcement " + r.getString("title"));
  } catch (err) {
    e.app.logger().error("Announcement notify failed", "error", String(err));
  }
}, "announcements");

onRecordAfterUpdateSuccess((e) => {
  e.next();
  const lib = require(`${__hooks}/lms_lib.js`);
  try {
    const r = e.record;
    if (!r.getBool("published")) return;
    const ens = e.app.findRecordsByFilter("enrollments", "course = {:c} && status = 'active'", "", 0, 0, { c: r.getString("course") });
    for (let i = 0; i < ens.length; i++) {
      lib.notify(e.app, ens[i].getString("user"), { type: "announcement", course: r.getString("course"), key: "announcement:" + r.id,
        link: "/learn/courses/" + r.getString("course") + "/announcements", title: "Announcement: " + r.getString("title"), body: "A new course announcement was posted." });
    }
  } catch (err) {
    e.app.logger().error("Announcement notify failed", "error", String(err));
  }
}, "announcements");

// Replies: keep topic counters current and tell the topic author.
onRecordAfterCreateSuccess((e) => {
  e.next();
  const lib = require(`${__hooks}/lms_lib.js`);
  try {
    const reply = e.record;
    const topic = e.app.findRecordById("discussion_topics", reply.getString("topic"));
    topic.set("reply_count", e.app.countRecords("discussion_replies", $dbx.hashExp({ topic: topic.id })));
    topic.set("last_activity_at", new DateTime());
    e.app.save(topic);
    if (topic.getString("author") !== reply.getString("author")) {
      let who = "Someone";
      try { const u = e.app.findRecordById("users", reply.getString("author")); who = u.getString("name") || "Someone"; } catch (_) {}
      lib.notify(e.app, topic.getString("author"), { type: "discussion_reply", course: topic.getString("course"), key: "reply:" + reply.id,
        link: "/learn/courses/" + topic.getString("course") + "/discussions/" + topic.id, title: "New reply: " + topic.getString("title"), body: who + " replied to your topic." });
    }
  } catch (err) {
    e.app.logger().error("Reply hook failed", "error", String(err));
  }
}, "discussion_replies");

onRecordAfterDeleteSuccess((e) => {
  e.next();
  try {
    const topic = e.app.findRecordById("discussion_topics", e.record.getString("topic"));
    topic.set("reply_count", e.app.countRecords("discussion_replies", $dbx.hashExp({ topic: topic.id })));
    e.app.save(topic);
  } catch (_) {}
}, "discussion_replies");

// =====================================================================
// SCHEDULED JOBS
// =====================================================================

// Auto-submit attempts whose timer or quiz window ran out (covers students who closed the tab).
cronAdd("lms_quiz_expiry", "*/2 * * * *", () => {
  const lib = require(`${__hooks}/lms_lib.js`);
  const cutoff = lib.pbDate(Date.now() - 30000);
  const now = lib.pbDate(Date.now());
  try {
    const rows = $app.findRecordsByFilter("quiz_attempts", "status = 'in_progress' && ((deadline != '' && deadline < {:t}) || (quiz.available_until != '' && quiz.available_until < {:n}))", "", 200, 0, { t: cutoff, n: now });
    for (let i = 0; i < rows.length; i++) {
      try { lib.finalizeAttempt($app, rows[i], true); } catch (err) { $app.logger().error("Auto-submit failed", "attempt", rows[i].id, "error", String(err)); }
    }
  } catch (err) {
    $app.logger().error("Quiz expiry job failed", "error", String(err));
  }
});

// Remind learners about assignments due in the next 24 hours that they haven't submitted (once per assignment).
cronAdd("lms_deadline_reminders", "10 * * * *", () => {
  const lib = require(`${__hooks}/lms_lib.js`);
  try {
    const rows = $app.findRecordsByFilter("assignments", "due_at != '' && due_at > {:now} && due_at < {:soon}", "", 500, 0, { now: lib.pbDate(Date.now()), soon: lib.pbDate(Date.now() + 86400000) });
    for (let i = 0; i < rows.length; i++) {
      const asg = rows[i];
      const act = $app.findRecordById("activities", asg.getString("activity"));
      if (!lib.activityVisible($app, act)) continue;
      const ens = $app.findRecordsByFilter("enrollments", "course = {:c} && status = 'active'", "", 0, 0, { c: asg.getString("course") });
      for (let j = 0; j < ens.length; j++) {
        const uid = ens[j].getString("user");
        let has = false;
        try { $app.findFirstRecordByFilter("submissions", "assignment = {:s} && user = {:u}", { s: asg.id, u: uid }); has = true; } catch (_) {}
        if (has) continue;
        lib.notify($app, uid, { type: "deadline", course: asg.getString("course"), key: "deadline:" + asg.id,
          link: "/learn/courses/" + asg.getString("course") + "/play/" + act.id, title: "Due soon: " + act.getString("title"), body: "This assignment is due within 24 hours." });
      }
    }
  } catch (err) {
    $app.logger().error("Deadline reminder job failed", "error", String(err));
  }
});
