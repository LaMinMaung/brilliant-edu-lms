/// <reference path="../pb_data/types.d.ts" />

// Phase 1 acceptance self-test. Runs the Admin -> Instructor -> Student workflow
// through the real REST API (real tokens, real access rules, real hooks) using
// temporary records, then deletes everything it created.
// Access: signed-in users whose role has the "system.view" permission.
routerAdd("POST", "/api/lms/selftest", (e) => {
  // ---------- access control ----------
  let allowed = false;
  if (e.auth && e.auth.collection().name === "users") {
    const role = $app.findRecordById("roles", e.auth.getString("role"));
    const perms = role.getStringSlice("permissions");
    for (let i = 0; i < perms.length; i++) if (perms[i] === "system.view") allowed = true;
  }
  if (!allowed) return e.json(403, { message: "Not permitted." });

  // ---------- helpers ----------
  let addr = "127.0.0.1:8090";
  try {
    const args = $os.args || [];
    for (let i = 0; i < args.length; i++) {
      const a = String(args[i]);
      if (a.indexOf("--http=") === 0) addr = a.slice(7);
      else if (a === "--http" && args[i + 1]) addr = String(args[i + 1]);
    }
  } catch (_) {}
  if (addr.indexOf("0.0.0.0") === 0) addr = "127.0.0.1" + addr.slice(7);
  if (addr.indexOf(":") === 0) addr = "127.0.0.1" + addr;
  // Probe for a reachable API address: local listener first, then the configured app URL.
  const candidates = ["http://" + addr, String($app.settings().meta.appURL || "").replace(/\/+$/, "")];
  let base = "";
  for (let i = 0; i < candidates.length && !base; i++) {
    if (!candidates[i]) continue;
    try {
      const h = $http.send({ url: candidates[i] + "/api/health", method: "GET", timeout: 5 });
      if (h.statusCode === 200) base = candidates[i];
    } catch (_) {}
  }
  if (!base) return e.json(200, { ok: false, passed: 0, total: 1, durationMs: 0, results: [{ group: "Runner", step: "Reach the API", ok: false, detail: "No reachable API address (tried " + candidates.join(", ") + ")" }] });

  const started = Date.now();
  const results = [];
  const created = { users: [], courses: [], categories: [] };

  function api(method, path, token, body) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = token;
    const res = $http.send({ url: base + path, method: method, headers: headers, body: body ? JSON.stringify(body) : "", timeout: 30 });
    return { status: res.statusCode, json: res.json || {}, raw: res.raw };
  }
  function upload(path, token, fields, fileName, contentType, content) {
    const b = "----lmsselftest" + $security.randomString(16);
    let body = "";
    for (const k in fields) body += "--" + b + '\r\nContent-Disposition: form-data; name="' + k + '"\r\n\r\n' + fields[k] + "\r\n";
    body += "--" + b + '\r\nContent-Disposition: form-data; name="file"; filename="' + fileName + '"\r\nContent-Type: ' + contentType + "\r\n\r\n" + content + "\r\n--" + b + "--\r\n";
    const res = $http.send({ url: base + path, method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=" + b, Authorization: token }, body: body, timeout: 30 });
    return { status: res.statusCode, json: res.json || {}, raw: res.raw };
  }
  function q(filter) { return encodeURIComponent(filter); }
  function check(group, step, ok, detail) {
    results.push({ group: group, step: step, ok: !!ok, detail: detail || "" });
    if (!ok) throw new Error("STEP_FAILED");
  }
  function brief(res) { return "HTTP " + res.status + (res.status >= 300 ? " " + String(res.raw || "").slice(0, 200) : ""); }
  function login(email, pw) { return api("POST", "/api/collections/users/auth-with-password", "", { identity: email, password: pw }); }
  function lib2Date(msValue) { return new Date(msValue).toISOString().replace("T", " "); }

  const tag = $security.randomString(8).toLowerCase().replace(/[^a-z0-9]/g, "x");
  const email = (r) => "lms-selftest-" + r + "-" + tag + "@example.com";
  const pw = { admin: $security.randomString(24), instructor: $security.randomString(24), student: $security.randomString(24) };

  try {
    // ---------- ADMINISTRATOR ----------
    const usersCol = $app.findCollectionByNameOrId("users");
    const adm = new Record(usersCol);
    adm.set("email", email("admin"));
    adm.set("password", pw.admin);
    adm.set("verified", true);
    adm.set("first_name", "Selftest");
    adm.set("last_name", "Admin");
    adm.set("role", "roleadmin000001");
    adm.set("status", "active");
    $app.save(adm);
    created.users.push(adm.id);

    let r = login(email("admin"), pw.admin);
    check("Administrator", "Admin logs in", r.status === 200 && r.json.token, brief(r));
    const adminToken = r.json.token;

    r = api("GET", "/api/collections/users/records?perPage=1", adminToken);
    const r2 = api("GET", "/api/collections/courses/records?perPage=1", adminToken);
    check("Administrator", "Admin sees dashboard data", r.status === 200 && r2.status === 200 && r.json.totalItems >= 1, "users=" + r.json.totalItems);

    r = api("POST", "/api/collections/users/records", adminToken, {
      email: email("instructor"), password: pw.instructor, passwordConfirm: pw.instructor, verified: true,
      first_name: "Selftest", last_name: "Instructor", role: "roleinstruct001", status: "active",
    });
    check("Administrator", "Admin creates instructor", r.status === 200, brief(r));
    const instructorId = r.json.id;
    created.users.push(instructorId);

    r = api("POST", "/api/collections/users/records", adminToken, {
      email: email("student"), password: pw.student, passwordConfirm: pw.student, verified: true,
      first_name: "Selftest", last_name: "Student", role: "rolestudent0001", status: "active",
    });
    check("Administrator", "Admin creates student", r.status === 200, brief(r));
    const studentId = r.json.id;
    created.users.push(studentId);

    r = api("POST", "/api/collections/categories/records", adminToken, { name: "Selftest " + tag, slug: "selftest-" + tag, sort_order: 99 });
    check("Administrator", "Admin creates category", r.status === 200, brief(r));
    const categoryId = r.json.id;
    created.categories.push(categoryId);

    r = api("POST", "/api/collections/courses/records", adminToken, {
      title: "Selftest course " + tag, slug: "selftest-course-" + tag, summary: "Temporary course", status: "draft",
      owner: adm.id, category: categoryId, self_enrollment: false,
    });
    check("Administrator", "Admin creates course", r.status === 200, brief(r));
    const courseId = r.json.id;
    created.courses.push(courseId);

    r = api("PATCH", "/api/collections/courses/records/" + courseId, adminToken, { instructors: [adm.id, instructorId] });
    check("Administrator", "Admin assigns instructor", r.status === 200 && (r.json.instructors || []).indexOf(instructorId) >= 0, brief(r));

    r = api("PATCH", "/api/collections/courses/records/" + courseId, adminToken, { status: "published" });
    check("Administrator", "Admin publishes course", r.status === 200 && r.json.status === "published", brief(r));

    r = api("POST", "/api/collections/enrollments/records", adminToken, { user: studentId, course: courseId, status: "active", method: "manual", enrolled_by: adm.id });
    check("Administrator", "Admin enrolls student", r.status === 200, brief(r));
    const enrollmentId = r.json.id;

    r = api("POST", "/api/collections/enrollments/records", adminToken, { user: studentId, course: courseId, status: "active", method: "manual" });
    check("Administrator", "Duplicate enrollment is rejected", r.status === 400, brief(r));

    // ---------- INSTRUCTOR ----------
    r = login(email("instructor"), pw.instructor);
    check("Instructor", "Instructor logs in", r.status === 200 && r.json.token, brief(r));
    const insToken = r.json.token;

    // Make the course a draft first so visibility comes from the instructor rule, not from "published".
    api("PATCH", "/api/collections/courses/records/" + courseId, adminToken, { status: "draft" });
    r = api("GET", "/api/collections/courses/records?filter=" + q("owner = '" + instructorId + "' || instructors.id ?= '" + instructorId + "'"), insToken);
    api("PATCH", "/api/collections/courses/records/" + courseId, adminToken, { status: "published" });
    const insItems = r.json.items || [];
    let insFound = false;
    for (let i = 0; i < insItems.length; i++) if (insItems[i].id === courseId) insFound = true;
    let diag = "";
    if (!insFound) {
      const d1 = api("GET", "/api/collections/courses/records?perPage=50", insToken);
      const d2 = api("GET", "/api/collections/courses/records/" + courseId, insToken);
      diag = " | noFilter=" + d1.status + "/" + (d1.json.items || []).length + " view=" + d2.status;
    }
    check("Instructor", "Instructor sees assigned course", r.status === 200 && insFound, brief(r) + " found=" + insItems.length + diag);

    r = api("PATCH", "/api/collections/courses/records/" + courseId, insToken, { summary: "Edited by instructor" });
    check("Instructor", "Instructor edits course", r.status === 200 && r.json.summary === "Edited by instructor", brief(r));

    r = api("PATCH", "/api/collections/courses/records/" + courseId, insToken, { owner: instructorId });
    check("Instructor", "Instructor cannot take over course ownership", r.status !== 200, brief(r));

    r = api("POST", "/api/collections/course_sections/records", insToken, { course: courseId, title: "Section 1", sort_order: 0, is_published: true });
    check("Instructor", "Instructor creates section", r.status === 200, brief(r));
    const sectionId = r.json.id;

    const lessons = [];
    for (let i = 1; i <= 2; i++) {
      r = api("POST", "/api/collections/activities/records", insToken, {
        course: courseId, section: sectionId, type: "lesson", title: "Lesson " + i, content: "<p>Lesson " + i + " content</p>",
        sort_order: i, is_published: false, completion_mode: "manual",
      });
      check("Instructor", "Instructor creates lesson " + i, r.status === 200, brief(r));
      lessons.push(r.json.id);
    }

    r = upload("/api/collections/materials/records", insToken, { course: courseId, activity: lessons[0], kind: "file", title: "Notes" }, "selftest-notes.txt", "text/plain", "Self-test learning material.");
    check("Instructor", "Instructor uploads learning material", r.status === 200 && r.json.original_name === "selftest-notes.txt" && r.json.size_bytes > 0 && r.json.uploaded_by === instructorId, brief(r) + " meta=" + r.json.original_name + "/" + r.json.size_bytes);
    const material = r.json;

    r = upload("/api/collections/materials/records", insToken, { course: courseId, activity: lessons[0], kind: "file", title: "Bad" }, "page.html", "text/html", "<!DOCTYPE html><html><body><script>alert(1)</script></body></html>");
    check("Instructor", "Unsafe upload (HTML/script) is rejected", r.status === 400, brief(r));

    for (let i = 0; i < lessons.length; i++) {
      r = api("PATCH", "/api/collections/activities/records/" + lessons[i], insToken, { is_published: true });
      check("Instructor", "Instructor publishes lesson " + (i + 1), r.status === 200 && r.json.is_published === true, brief(r));
    }

    r = api("GET", "/api/collections/enrollments/records?filter=" + q("course = '" + courseId + "'") + "&expand=user", insToken);
    const seen = (r.json.items || []).filter((x) => x.user === studentId);
    check("Instructor", "Instructor sees enrolled student", r.status === 200 && seen.length === 1 && seen[0].expand && seen[0].expand.user, "items=" + (r.json.items || []).length);

    // ---------- STUDENT ----------
    r = login(email("student"), pw.student);
    check("Student", "Student logs in", r.status === 200 && r.json.token, brief(r));
    const stuToken = r.json.token;

    r = api("GET", "/api/collections/enrollments/records?filter=" + q("user = '" + studentId + "'") + "&expand=course", stuToken);
    check("Student", "Student dashboard shows enrolled course", r.status === 200 && (r.json.items || []).length === 1 && r.json.items[0].expand.course.id === courseId, brief(r));

    r = api("GET", "/api/collections/courses/records/" + courseId, stuToken);
    check("Student", "Student opens course", r.status === 200, brief(r));

    r = api("GET", "/api/collections/course_sections/records?filter=" + q("course = '" + courseId + "'"), stuToken);
    check("Student", "Student sees sections", r.status === 200 && (r.json.items || []).length === 1, "sections=" + (r.json.items || []).length);

    r = api("GET", "/api/collections/activities/records?filter=" + q("course = '" + courseId + "'"), stuToken);
    const r3 = api("GET", "/api/collections/activities/records/" + lessons[0], stuToken);
    check("Student", "Student opens lessons", r.status === 200 && (r.json.items || []).length === 2 && r3.status === 200 && String(r3.json.content).indexOf("Lesson 1") >= 0, "lessons=" + (r.json.items || []).length);

    r = api("GET", "/api/collections/materials/records?filter=" + q("activity = '" + lessons[0] + "'"), stuToken);
    const tok = api("POST", "/api/files/token", stuToken);
    const fileUrl = "/api/files/" + material.collectionId + "/" + material.id + "/" + material.file;
    const withToken = $http.send({ url: base + fileUrl + "?token=" + encodeURIComponent(tok.json.token || ""), method: "GET", timeout: 30 });
    check("Student", "Student accesses material (with access token)", r.status === 200 && (r.json.items || []).length === 1 && withToken.statusCode === 200, "file HTTP " + withToken.statusCode);

    const noToken = $http.send({ url: base + fileUrl, method: "GET", timeout: 30 });
    check("Security", "Private file is not reachable without a token", noToken.statusCode !== 200, "HTTP " + noToken.statusCode);

    r = api("PATCH", "/api/collections/users/records/" + studentId, stuToken, { role: "roleadmin000001" });
    check("Security", "Student cannot escalate own role", r.status !== 200, brief(r));

    r = api("PATCH", "/api/collections/enrollments/records/" + enrollmentId, stuToken, { progress: 100 });
    check("Security", "Student cannot write own progress directly", r.status !== 200, brief(r));

    r = api("POST", "/api/collections/courses/records", stuToken, { title: "x", slug: "x-" + tag, status: "draft", owner: studentId });
    check("Security", "Student cannot create courses", r.status !== 200, brief(r));

    r = api("GET", "/api/collections/users/records/" + adm.id + "?fields=id,email", stuToken);
    check("Security", "Other users' emails are not exposed", r.status !== 200 || !r.json.email, brief(r));

    r = api("GET", "/api/collections/activity_log/records?perPage=200", stuToken);
    check("Security", "Student sees only own activity records", r.status === 200 && (r.json.items || []).every((x) => x.actor === studentId), "items=" + (r.json.items || []).length);

    const now = new Date().toISOString().replace("T", " ");
    r = api("POST", "/api/collections/activity_progress/records", stuToken, {
      user: studentId, course: courseId, activity: lessons[0], completed: true, completed_at: now, first_accessed: now, last_accessed: now, view_count: 1,
    });
    check("Student", "Student marks lesson 1 completed", r.status === 200, brief(r));

    r = api("GET", "/api/collections/enrollments/records/" + enrollmentId, stuToken);
    check("Student", "Progress updates to 50% (1 of 2)", r.status === 200 && r.json.progress === 50 && r.json.completed_count === 1 && r.json.total_count === 2 && r.json.completion_status === "in_progress",
      "progress=" + r.json.progress + " " + r.json.completed_count + "/" + r.json.total_count + " " + r.json.completion_status);

    r = api("POST", "/api/collections/activity_progress/records", stuToken, {
      user: studentId, course: courseId, activity: lessons[1], completed: true, completed_at: now, first_accessed: now, last_accessed: now, view_count: 1,
    });
    check("Student", "Student marks lesson 2 completed", r.status === 200, brief(r));

    r = api("GET", "/api/collections/enrollments/records?filter=" + q("user = '" + studentId + "'"), stuToken);
    const en = (r.json.items || [])[0] || {};
    check("Student", "Overall course progress is 100% and completed", en.progress === 100 && en.completion_status === "completed" && !!en.completed_at, "progress=" + en.progress + " " + en.completion_status);

    // ---------- SELF-ENROLLMENT ----------
    r = api("POST", "/api/collections/courses/records", adminToken, { title: "Selftest open " + tag, slug: "selftest-open-" + tag, status: "published", owner: adm.id, self_enrollment: true });
    const openId = r.json.id;
    if (openId) created.courses.push(openId);
    r = api("POST", "/api/collections/courses/records", adminToken, { title: "Selftest closed " + tag, slug: "selftest-closed-" + tag, status: "published", owner: adm.id, self_enrollment: false });
    const closedId = r.json.id;
    if (closedId) created.courses.push(closedId);
    r = api("POST", "/api/collections/enrollments/records", stuToken, { user: studentId, course: openId, status: "active", method: "self" });
    check("Enrollment", "Student self-enrolls in an open course", r.status === 200 && r.json.progress === 0, brief(r));
    r = api("POST", "/api/collections/enrollments/records", stuToken, { user: studentId, course: closedId, status: "active", method: "self" });
    check("Enrollment", "Self-enrollment into invitation-only course is rejected", r.status !== 200, brief(r));
    r = api("POST", "/api/collections/enrollments/records", stuToken, { user: instructorId, course: openId, status: "active", method: "self" });
    check("Enrollment", "Student cannot enroll someone else", r.status !== 200, brief(r));

    // =========================== PHASE 2 ===========================
    function multi(path, token, fields, files) {
      const b = "----lmsselftest" + $security.randomString(16);
      let body = "";
      for (const k in fields) body += "--" + b + '\r\nContent-Disposition: form-data; name="' + k + '"\r\n\r\n' + fields[k] + "\r\n";
      for (let i = 0; i < files.length; i++) {
        body += "--" + b + '\r\nContent-Disposition: form-data; name="' + files[i].field + '"; filename="' + files[i].name + '"\r\nContent-Type: ' + files[i].type + "\r\n\r\n" + files[i].content + "\r\n";
      }
      body += "--" + b + "--\r\n";
      const res = $http.send({ url: base + path, method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=" + b, Authorization: token }, body: body, timeout: 30 });
      return { status: res.statusCode, json: res.json || {}, raw: res.raw };
    }
    function items(res) { return (res.json && res.json.items) || []; }
    function enrollmentOf() { return api("GET", "/api/collections/enrollments/records/" + enrollmentId, adminToken).json; }

    // A second student who is NOT enrolled — used for isolation checks.
    r = api("POST", "/api/collections/users/records", adminToken, {
      email: email("outsider"), password: pw.student, passwordConfirm: pw.student, verified: true,
      first_name: "Selftest", last_name: "Outsider", role: "rolestudent0001", status: "active",
    });
    const outsiderId = r.json.id;
    if (outsiderId) created.users.push(outsiderId);
    r = login(email("outsider"), pw.student);
    check("Setup", "Second (non-enrolled) student logs in", r.status === 200 && r.json.token, brief(r));
    const outToken = r.json.token;

    // ---------- QUIZ ----------
    r = api("POST", "/api/collections/activities/records", insToken, { course: courseId, section: sectionId, type: "quiz", title: "Quiz 1", completion_mode: "pass", is_published: false, sort_order: 10 });
    check("Quiz", "Instructor creates a quiz activity", r.status === 200, brief(r));
    const quizAct = r.json.id;
    r = api("GET", "/api/collections/quizzes/records?filter=" + q("activity = '" + quizAct + "'"), insToken);
    check("Quiz", "Quiz settings record is created automatically", items(r).length === 1, brief(r));
    const quizId = items(r)[0].id;
    r = api("PATCH", "/api/collections/quizzes/records/" + quizId, insToken, { passing_score: 60, max_attempts: 2, time_limit_minutes: 10, show_results: "immediately", show_correct_answers: true, shuffle_questions: true, shuffle_choices: true });
    check("Quiz", "Instructor configures points/pass mark/time/attempts/shuffle", r.status === 200 && r.json.max_attempts === 2, brief(r));
    r = api("POST", "/api/collections/question_categories/records", insToken, { course: courseId, name: "Biology" });
    check("Quiz", "Instructor creates a question-bank category", r.status === 200, brief(r));
    const qcat = r.json.id;
    const qMC = api("POST", "/api/collections/questions/records", insToken, { course: courseId, category: qcat, type: "multiple_choice", prompt: "Which organelle makes energy?", choices: [{ id: "a", text: "Nucleus" }, { id: "b", text: "Mitochondria" }, { id: "c", text: "Ribosome" }], answer: ["b"], points: 2, feedback: "Mitochondria produce ATP." });
    const qTF = api("POST", "/api/collections/questions/records", insToken, { course: courseId, category: qcat, type: "true_false", prompt: "Plants need light.", answer: "true", points: 1 });
    const qSA = api("POST", "/api/collections/questions/records", insToken, { course: courseId, category: qcat, type: "short_answer", prompt: "Name the process plants use to make food.", answer: ["photosynthesis"], points: 2 });
    check("Quiz", "Instructor creates multiple-choice, true/false and short-answer questions", qMC.status === 200 && qTF.status === 200 && qSA.status === 200, brief(qMC) + " " + brief(qTF) + " " + brief(qSA));
    const qids = [qMC.json.id, qTF.json.id, qSA.json.id];
    let linked = 0;
    for (let i = 0; i < qids.length; i++) {
      r = api("POST", "/api/collections/quiz_questions/records", insToken, { quiz: quizId, question: qids[i], course: courseId, sort_order: i });
      if (r.status === 200) linked++;
    }
    check("Quiz", "Questions are added to the quiz from the bank", linked === 3, "linked=" + linked);
    r = api("PATCH", "/api/collections/activities/records/" + quizAct, insToken, { is_published: true });
    check("Quiz", "Instructor publishes the quiz", r.status === 200 && r.json.is_published === true, brief(r));

    r = api("GET", "/api/collections/questions/records?filter=" + q("course = '" + courseId + "'"), stuToken);
    const r2b = api("GET", "/api/collections/questions/records/" + qids[0], stuToken);
    check("Security", "Students cannot read the question bank / answer keys", items(r).length === 0 && r2b.status === 404, "list=" + items(r).length + " view=" + r2b.status);
    r = api("GET", "/api/collections/quiz_questions/records", stuToken);
    check("Security", "Students cannot read quiz composition directly", items(r).length === 0, "items=" + items(r).length);

    r = api("GET", "/api/lms/quizzes/" + quizAct + "/summary", stuToken);
    check("Quiz", "Student sees quiz summary and can start", r.status === 200 && r.json.can_start === true && r.json.question_count === 3 && r.json.total_points === 5, brief(r) + " " + String(r.raw).slice(0, 160));
    r = api("GET", "/api/lms/quizzes/" + quizAct + "/summary", outToken);
    check("Security", "Non-enrolled student cannot open the quiz", r.status === 404, brief(r));

    r = api("POST", "/api/lms/quizzes/" + quizAct + "/start", stuToken);
    const qs = (r.json && r.json.questions) || [];
    let leak = false;
    for (let i = 0; i < qs.length; i++) if (qs[i].correct !== undefined && qs[i].correct !== null) leak = true;
    check("Quiz", "Student starts attempt 1 (questions delivered without answer keys)", r.status === 200 && qs.length === 3 && !leak && !!r.json.attempt.deadline, brief(r));
    const att1 = r.json.attempt.id;
    r = api("POST", "/api/lms/quizzes/" + quizAct + "/start", stuToken);
    check("Quiz", "Re-opening resumes the same in-progress attempt", r.status === 200 && r.json.attempt.id === att1, brief(r));
    r = api("GET", "/api/lms/quiz-attempts/" + att1, outToken);
    check("Security", "Another student cannot read this attempt", r.status === 404, brief(r));

    const good = {}; good[qids[0]] = ["b"]; good[qids[1]] = "true"; good[qids[2]] = "  Photosynthesis ";
    r = api("POST", "/api/lms/quiz-attempts/" + att1 + "/answer", stuToken, { answers: good });
    check("Quiz", "Answers are autosaved", r.status === 200 && r.json.saved === 3, brief(r));
    r = api("POST", "/api/lms/quiz-attempts/" + att1 + "/submit", stuToken, {});
    let keyShown = false;
    const sq = (r.json && r.json.questions) || [];
    for (let i = 0; i < sq.length; i++) if (sq[i].correct !== undefined && sq[i].correct !== null) keyShown = true;
    check("Quiz", "Objective + matching short answer auto-graded (5/5, passed)", r.status === 200 && r.json.attempt.status === "graded" && r.json.attempt.score === 5 && r.json.attempt.passed === true && keyShown,
      brief(r) + " status=" + (r.json.attempt || {}).status + " score=" + (r.json.attempt || {}).score);
    let enr = enrollmentOf();
    check("Progress", "Passing the quiz completes it in course progress (3/3 = 100%)", enr.completed_count === 3 && enr.total_count === 3 && enr.progress === 100, enr.completed_count + "/" + enr.total_count + " " + enr.progress + "%");

    r = api("POST", "/api/lms/quizzes/" + quizAct + "/start", stuToken);
    const att2 = r.json.attempt ? r.json.attempt.id : "";
    check("Quiz", "Student starts attempt 2", r.status === 200 && att2 && att2 !== att1 && r.json.attempt.attempt_number === 2, brief(r));
    const bad = {}; bad[qids[0]] = ["a"]; bad[qids[1]] = "false"; bad[qids[2]] = "chlorophyll";
    r = api("POST", "/api/lms/quiz-attempts/" + att2 + "/submit", stuToken, { answers: bad });
    check("Quiz", "Unmatched short answer is queued for manual grading", r.status === 200 && r.json.attempt.status === "needs_grading", brief(r) + " status=" + (r.json.attempt || {}).status);
    r = api("POST", "/api/lms/quizzes/" + quizAct + "/start", stuToken);
    check("Quiz", "Attempt limit is enforced (3rd attempt rejected)", r.status === 400, brief(r));

    r = api("GET", "/api/lms/grading/queue", insToken);
    const queued = items(r).filter((x) => x.kind === "quiz_attempt" && x.id === att2).length;
    check("Grading", "Attempt appears in the instructor grading queue", r.status === 200 && queued === 1, brief(r));
    r = api("GET", "/api/lms/quiz-attempts/" + att2, insToken);
    const saQ = ((r.json && r.json.questions) || []).filter((x) => x.id === qids[2])[0] || {};
    check("Grading", "Instructor sees the student's answer with the key", r.status === 200 && saQ.answer === "chlorophyll" && !!saQ.response_id && !!saQ.correct, brief(r));
    r = api("POST", "/api/lms/quiz-responses/" + saQ.response_id + "/grade", stuToken, { points: 2 });
    check("Security", "Student cannot grade their own response", r.status === 404, brief(r));
    r = api("POST", "/api/lms/quiz-responses/" + saQ.response_id + "/grade", insToken, { points: 1, feedback: "Related, but not the process." });
    check("Grading", "Instructor manually grades the short answer; attempt finalised", r.status === 200 && r.json.attempt.status === "graded" && r.json.attempt.score === 1, brief(r) + " " + String(r.raw).slice(0, 120));
    r = api("GET", "/api/collections/notifications/records?perPage=100", stuToken);
    const qNotes = items(r).filter((x) => x.type === "quiz_result");
    check("Notifications", "Student is notified of quiz results", qNotes.length >= 2, "quiz_result=" + qNotes.length);

    // ---------- ASSIGNMENT ----------
    r = api("POST", "/api/collections/activities/records", insToken, { course: courseId, section: sectionId, type: "assignment", title: "Essay 1", content: "<p>Write about cells.</p>", completion_mode: "submit", is_published: true, sort_order: 11 });
    check("Assignment", "Instructor creates an assignment activity", r.status === 200, brief(r));
    const asgAct = r.json.id;
    r = api("GET", "/api/collections/assignments/records?filter=" + q("activity = '" + asgAct + "'"), insToken);
    const asgId = (items(r)[0] || {}).id;
    r = api("PATCH", "/api/collections/assignments/records/" + asgId, insToken, { max_marks: 20, pass_marks: 10, submission_type: "text_and_file", allowed_extensions: "txt, pdf", max_files: 2, max_file_mb: 5, max_submissions: 2, allow_late: false, due_at: lib2Date(Date.now() + 2 * 86400000) });
    check("Assignment", "Instructor sets due date, marks, file types and limits", r.status === 200 && r.json.max_marks === 20, brief(r));
    enr = enrollmentOf();
    check("Progress", "New published assignment is counted (3/4)", enr.total_count === 4 && enr.completed_count === 3, enr.completed_count + "/" + enr.total_count);

    r = multi("/api/lms/assignments/" + asgAct + "/submit", stuToken, { text: "My essay about cells." }, [{ field: "files", name: "essay.txt", type: "text/plain", content: "Cells are the basic unit of life." }]);
    check("Assignment", "Student submits text + file", r.status === 200 && r.json.number === 1 && r.json.is_late === false && (r.json.files || []).length === 1, brief(r));
    const sub1 = r.json.id;
    r = multi("/api/lms/assignments/" + asgAct + "/submit", stuToken, { text: "x" }, [{ field: "files", name: "page.html", type: "text/html", content: "<script>alert(1)</script>" }]);
    check("Assignment", "Disallowed file type is rejected", r.status === 400, brief(r));
    enr = enrollmentOf();
    check("Progress", "Submitting completes the assignment (4/4 = 100%)", enr.completed_count === 4 && enr.progress === 100, enr.completed_count + "/" + enr.total_count + " " + enr.progress + "%");
    r = multi("/api/lms/assignments/" + asgAct + "/submit", stuToken, { text: "Revised essay." }, []);
    check("Assignment", "Student resubmits (tracked as submission #2)", r.status === 200 && r.json.number === 2 && r.json.is_latest === true, brief(r));
    const sub2 = r.json.id;
    const old = api("GET", "/api/collections/submissions/records/" + sub1, stuToken);
    check("Assignment", "Earlier submission kept as history", old.status === 200 && old.json.is_latest === false, brief(old));
    r = multi("/api/lms/assignments/" + asgAct + "/submit", stuToken, { text: "Third try" }, []);
    check("Assignment", "Submission limit is enforced", r.status === 400, brief(r));
    r = api("POST", "/api/collections/submissions/records", stuToken, { assignment: asgId, activity: asgAct, course: courseId, user: studentId, number: 9, status: "graded", grade: 20 });
    check("Security", "Students cannot write submissions/grades directly", r.status !== 200, brief(r));
    r = api("GET", "/api/collections/submissions/records/" + sub2, outToken);
    const r3b = api("GET", "/api/collections/submissions/records", outToken);
    check("Security", "Another student cannot see this submission", r.status === 404 && items(r3b).length === 0, brief(r));
    const f = (old.json.files || [])[0];
    const ftok = api("POST", "/api/files/token", outToken);
    const fres = $http.send({ url: base + "/api/files/" + old.json.collectionId + "/" + sub1 + "/" + f + "?token=" + encodeURIComponent(ftok.json.token || ""), method: "GET", timeout: 30 });
    check("Security", "Another student cannot download submission files", fres.statusCode !== 200, "HTTP " + fres.statusCode);

    r = api("POST", "/api/lms/submissions/" + sub2 + "/grade", stuToken, { grade: 20 });
    check("Security", "Student cannot grade a submission", r.status === 404, brief(r));
    r = api("POST", "/api/lms/submissions/" + sub2 + "/grade", insToken, { grade: 25 });
    check("Grading", "Grade above maximum is rejected", r.status === 400, brief(r));
    r = api("POST", "/api/lms/submissions/" + sub2 + "/grade", insToken, { grade: 15, feedback: "Good structure; add sources." });
    check("Grading", "Instructor grades the submission with feedback", r.status === 200 && r.json.status === "graded" && r.json.grade === 15, brief(r));
    r = api("GET", "/api/collections/submissions/records/" + sub2, stuToken);
    check("Assignment", "Student sees own grade and feedback", r.status === 200 && r.json.grade === 15 && r.json.feedback.indexOf("sources") >= 0, brief(r));

    r = api("GET", "/api/collections/notifications/records?perPage=100", stuToken);
    const gNote = items(r).filter((x) => x.type === "assignment_graded")[0];
    check("Notifications", "Student is notified of the assignment grade", !!gNote && gNote.read === false, "found=" + !!gNote);
    r = api("PATCH", "/api/collections/notifications/records/" + gNote.id, stuToken, { read: true, read_at: lib2Date(Date.now()) });
    check("Notifications", "Student marks a notification as read", r.status === 200 && r.json.read === true, brief(r));
    r = api("PATCH", "/api/collections/notifications/records/" + gNote.id, stuToken, { title: "tampered" });
    check("Security", "Notification content cannot be altered", r.status !== 200, brief(r));
    r = api("GET", "/api/collections/notifications/records/" + gNote.id, outToken);
    check("Security", "Another user cannot read this notification", r.status === 404, brief(r));
    r = api("GET", "/api/collections/notifications/records?perPage=100", insToken);
    check("Notifications", "Instructor was notified of the submissions", items(r).filter((x) => x.type === "submission_received").length >= 2, "count=" + items(r).filter((x) => x.type === "submission_received").length);

    // ---------- GRADEBOOK ----------
    r = api("GET", "/api/lms/grades/" + courseId, insToken);
    const row = ((r.json && r.json.rows) || []).filter((x) => x.user.id === studentId)[0];
    check("Gradebook", "Instructor gradebook shows quiz and assignment grades", r.status === 200 && !!row && row.cells[quizAct].status === "graded" && row.cells[asgAct].score === 15, brief(r));
    r = api("GET", "/api/lms/grades/" + courseId, stuToken);
    check("Gradebook", "Student sees only their own grades", r.status === 200 && r.json.rows.length === 1 && r.json.rows[0].user.id === studentId, brief(r));
    r = api("GET", "/api/lms/grades/" + courseId, outToken);
    check("Security", "Non-enrolled user cannot open the gradebook", r.status === 404, brief(r));

    // ---------- ANNOUNCEMENTS & DISCUSSIONS ----------
    r = api("POST", "/api/collections/announcements/records", insToken, { course: courseId, author: instructorId, title: "Welcome", body: "<p>Hello class</p>", published: true });
    check("Announcements", "Instructor posts an announcement", r.status === 200, brief(r));
    const annId = r.json.id;
    r = api("GET", "/api/collections/notifications/records?filter=" + q("dedupe_key = 'announcement:" + annId + "'"), stuToken);
    check("Notifications", "Enrolled student is notified once of the announcement", items(r).length === 1, "count=" + items(r).length);
    r = api("PATCH", "/api/collections/announcements/records/" + annId, insToken, { title: "Welcome!" });
    const again = api("GET", "/api/collections/notifications/records?filter=" + q("dedupe_key = 'announcement:" + annId + "'"), stuToken);
    check("Notifications", "Editing the announcement does not duplicate notifications", items(again).length === 1, "count=" + items(again).length);
    r = api("POST", "/api/collections/announcements/records", stuToken, { course: courseId, author: studentId, title: "x", published: true });
    check("Security", "Students cannot post announcements", r.status !== 200, brief(r));
    r = api("GET", "/api/collections/announcements/records?filter=" + q("course = '" + courseId + "'"), outToken);
    check("Security", "Non-enrolled users cannot read announcements", items(r).length === 0, "items=" + items(r).length);

    r = api("POST", "/api/collections/discussion_topics/records", stuToken, { course: courseId, author: studentId, title: "Question about cells", body: "What is ATP?" });
    check("Discussions", "Student starts a discussion topic", r.status === 200, brief(r));
    const topicId = r.json.id;
    r = api("POST", "/api/collections/discussion_topics/records", stuToken, { course: courseId, author: studentId, title: "Pin me", body: "x", pinned: true });
    check("Security", "Students cannot pin topics", r.status !== 200, brief(r));
    r = api("POST", "/api/collections/discussion_replies/records", insToken, { topic: topicId, course: courseId, author: instructorId, body: "Energy currency of the cell." });
    check("Discussions", "Instructor replies", r.status === 200, brief(r));
    const replyId = r.json.id;
    r = api("GET", "/api/collections/discussion_topics/records/" + topicId, stuToken);
    check("Discussions", "Reply count updates", r.status === 200 && r.json.reply_count === 1, brief(r) + " count=" + r.json.reply_count);
    r = api("GET", "/api/collections/notifications/records?filter=" + q("type = 'discussion_reply'"), stuToken);
    check("Notifications", "Topic author is notified of the reply", items(r).length === 1, "count=" + items(r).length);
    r = api("PATCH", "/api/collections/discussion_replies/records/" + replyId, stuToken, { body: "hijacked" });
    check("Security", "Students cannot edit others' replies", r.status !== 200, brief(r));
    r = api("GET", "/api/collections/discussion_topics/records?filter=" + q("course = '" + courseId + "'"), outToken);
    check("Security", "Non-enrolled users cannot read discussions", items(r).length === 0, "items=" + items(r).length);
    r = api("PATCH", "/api/collections/discussion_topics/records/" + topicId, insToken, { locked: true });
    const lockedReply = api("POST", "/api/collections/discussion_replies/records", stuToken, { topic: topicId, course: courseId, author: studentId, body: "one more" });
    check("Discussions", "Locked topics reject student replies", r.status === 200 && lockedReply.status !== 200, brief(lockedReply));

    // ---------- AUDIT ----------
    r = api("GET", "/api/collections/activity_log/records?perPage=200&filter=" + q("target_id = '" + courseId + "' || actor = '" + studentId + "'"), adminToken);
    const actions = (r.json.items || []).map((x) => x.action);
    const need = ["course.created", "course.updated", "course.published", "enrollment.created", "lesson.completed"];
    const missing = need.filter((a) => actions.indexOf(a) === -1);
    check("Audit", "Activity log recorded the workflow", r.status === 200 && missing.length === 0, missing.length ? "missing: " + missing.join(", ") : actions.length + " entries");
  } catch (err) {
    if (String(err).indexOf("STEP_FAILED") === -1) results.push({ group: "Runner", step: "Unexpected error", ok: false, detail: String(err).slice(0, 300) });
  } finally {
    // ---------- cleanup (courses cascade to sections, lessons, files, enrollments, progress) ----------
    for (let i = 0; i < created.courses.length; i++) { try { $app.delete($app.findRecordById("courses", created.courses[i])); } catch (_) {} }
    for (let i = 0; i < created.categories.length; i++) { try { $app.delete($app.findRecordById("categories", created.categories[i])); } catch (_) {} }
    for (let i = created.users.length - 1; i >= 0; i--) { try { $app.delete($app.findRecordById("users", created.users[i])); } catch (_) {} }
    try {
      const leftovers = $app.findRecordsByFilter("activity_log", "target_id = {:c} || target_id = {:cat}", "", 0, 0, { c: created.courses[0] || "-", cat: created.categories[0] || "-" });
      for (let i = 0; i < leftovers.length; i++) $app.delete(leftovers[i]);
    } catch (_) {}
  }

  const passed = results.filter((x) => x.ok).length;
  const ok = results.length > 0 && passed === results.length;
  if (!ok) $app.logger().warn("LMS self-test failed", "passed", passed, "total", results.length);
  return e.json(200, { ok: ok, passed: passed, total: results.length, durationMs: Date.now() - started, results: results });
});
