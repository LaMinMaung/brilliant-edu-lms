migrate((app) => {
  const P = (perm) => `@request.auth.role.permissions ~ '"${perm}"'`
  const AUTH = `@request.auth.id != ""`
  const ENROLLED = (c) => `(@collection.enrollments.user ?= @request.auth.id && @collection.enrollments.course ?= ${c} && @collection.enrollments.status ?= "active")`
  const STAFF = `(${P("courses.manage_all")} || (${P("courses.teach")} && (course.owner = @request.auth.id || course.instructors.id ?= @request.auth.id)))`
  const ACT_VISIBLE = `activity.is_published = true && activity.section.is_published = true && course.status != "draft"`
  const ts = [
    { type: "autodate", name: "created", onCreate: true, onUpdate: false },
    { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
  ]
  const users = app.findCollectionByNameOrId("users")
  const courses = app.findCollectionByNameOrId("courses")
  const FILE_TYPES = [
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.oasis.opendocument.text", "application/vnd.oasis.opendocument.presentation",
    "application/vnd.oasis.opendocument.spreadsheet", "application/rtf", "text/plain", "text/csv",
    "image/png", "image/jpeg", "image/gif", "image/webp", "application/zip",
  ]

  // ---- Activities: new types + completion modes ----
  const activities = app.findCollectionByNameOrId("activities")
  activities.fields.getByName("type").values = ["lesson", "quiz", "assignment"]
  activities.fields.getByName("completion_mode").values = ["manual", "view", "none", "submit", "pass"]
  app.save(activities)

  // ---- Students may only self-complete manual/view lessons; quiz/assignment completion is server-set ----
  const progress = app.findCollectionByNameOrId("activity_progress")
  progress.createRule = `${AUTH} && user = @request.auth.id && activity.course = course && activity.is_published = true && (completed = false || activity.completion_mode = "manual" || activity.completion_mode = "view") && ${ENROLLED("course")}`
  progress.updateRule = `${AUTH} && user = @request.auth.id && @request.body.user:isset = false && @request.body.course:isset = false && @request.body.activity:isset = false && (@request.body.completed:isset = false || activity.completion_mode = "manual" || activity.completion_mode = "view") && ${ENROLLED("course")}`
  app.save(progress)

  // ---- Question bank ----
  const qcats = new Collection({
    name: "question_categories", type: "base",
    listRule: `${AUTH} && ${STAFF}`, viewRule: `${AUTH} && ${STAFF}`,
    createRule: `${AUTH} && ${STAFF}`, updateRule: `${AUTH} && ${STAFF} && @request.body.course:isset = false`, deleteRule: `${AUTH} && ${STAFF}`,
    fields: [
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "name", required: true, max: 120 },
      { type: "number", name: "sort_order", onlyInt: true },
      ...ts,
    ],
    indexes: ["CREATE INDEX idx_qcats_course ON question_categories (course)"],
  })
  app.save(qcats)

  const questions = new Collection({
    name: "questions", type: "base",
    // Answer keys live here: course staff only. Students receive questions via server endpoints.
    listRule: `${AUTH} && ${STAFF}`, viewRule: `${AUTH} && ${STAFF}`,
    createRule: `${AUTH} && ${STAFF}`, updateRule: `${AUTH} && ${STAFF} && @request.body.course:isset = false`, deleteRule: `${AUTH} && ${STAFF}`,
    fields: [
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "category", collectionId: qcats.id, maxSelect: 1 },
      { type: "select", name: "type", required: true, values: ["multiple_choice", "true_false", "short_answer"], maxSelect: 1 },
      { type: "text", name: "prompt", required: true, max: 5000 },
      { type: "json", name: "choices", maxSize: 20000 },
      { type: "json", name: "answer", maxSize: 20000 },
      { type: "bool", name: "multiple" },
      { type: "bool", name: "case_sensitive" },
      { type: "number", name: "points", min: 0, max: 1000 },
      { type: "text", name: "feedback", max: 2000 },
      { type: "relation", name: "created_by", collectionId: users.id, maxSelect: 1 },
      ...ts,
    ],
    indexes: ["CREATE INDEX idx_questions_course ON questions (course)"],
  })
  app.save(questions)

  // ---- Quizzes (1:1 with an activity of type quiz) ----
  const quizzes = new Collection({
    name: "quizzes", type: "base",
    listRule: `${AUTH} && (${STAFF} || (${ACT_VISIBLE} && ${ENROLLED("course")}))`,
    viewRule: `${AUTH} && (${STAFF} || (${ACT_VISIBLE} && ${ENROLLED("course")}))`,
    createRule: `${AUTH} && ${STAFF} && activity.course = course && activity.type = "quiz"`,
    updateRule: `${AUTH} && ${STAFF} && @request.body.course:isset = false && @request.body.activity:isset = false`,
    deleteRule: `${AUTH} && ${STAFF}`,
    fields: [
      { type: "relation", name: "activity", required: true, collectionId: activities.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "number", name: "time_limit_minutes", min: 0, max: 1440, onlyInt: true },
      { type: "number", name: "max_attempts", min: 0, max: 100, onlyInt: true },
      { type: "number", name: "passing_score", min: 0, max: 100 },
      { type: "bool", name: "shuffle_questions" },
      { type: "bool", name: "shuffle_choices" },
      { type: "date", name: "available_from" },
      { type: "date", name: "available_until" },
      { type: "select", name: "show_results", values: ["immediately", "after_close", "never"], maxSelect: 1 },
      { type: "bool", name: "show_correct_answers" },
      ...ts,
    ],
    indexes: ["CREATE UNIQUE INDEX idx_quizzes_activity ON quizzes (activity)"],
  })
  app.save(quizzes)

  const quizQuestions = new Collection({
    name: "quiz_questions", type: "base",
    listRule: `${AUTH} && ${STAFF}`, viewRule: `${AUTH} && ${STAFF}`,
    createRule: `${AUTH} && ${STAFF} && quiz.course = course && question.course = course`,
    updateRule: `${AUTH} && ${STAFF} && @request.body.course:isset = false && @request.body.quiz:isset = false && @request.body.question:isset = false`,
    deleteRule: `${AUTH} && ${STAFF}`,
    fields: [
      { type: "relation", name: "quiz", required: true, collectionId: quizzes.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "question", required: true, collectionId: questions.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "number", name: "sort_order", onlyInt: true },
      { type: "number", name: "points", min: 0, max: 1000 },
      ...ts,
    ],
    indexes: ["CREATE UNIQUE INDEX idx_quizq_unique ON quiz_questions (quiz, question)"],
  })
  app.save(quizQuestions)

  // Attempts & responses: written only by trusted server endpoints; readable by course staff.
  const attempts = new Collection({
    name: "quiz_attempts", type: "base",
    listRule: `${AUTH} && ${STAFF}`, viewRule: `${AUTH} && ${STAFF}`,
    createRule: null, updateRule: null, deleteRule: `${AUTH} && ${P("courses.manage_all")}`,
    fields: [
      { type: "relation", name: "quiz", required: true, collectionId: quizzes.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "activity", required: true, collectionId: activities.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "user", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: "number", name: "attempt_number", min: 1, onlyInt: true },
      { type: "select", name: "status", required: true, values: ["in_progress", "needs_grading", "graded"], maxSelect: 1 },
      { type: "date", name: "started_at" },
      { type: "date", name: "deadline" },
      { type: "date", name: "submitted_at" },
      { type: "number", name: "score", min: 0 },
      { type: "number", name: "max_score", min: 0 },
      { type: "number", name: "percent", min: 0, max: 100 },
      { type: "bool", name: "passed" },
      { type: "bool", name: "auto_submitted" },
      { type: "json", name: "layout", maxSize: 200000 },
      ...ts,
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_attempts_unique ON quiz_attempts (quiz, user, attempt_number)",
      "CREATE INDEX idx_attempts_course ON quiz_attempts (course)",
      "CREATE INDEX idx_attempts_status ON quiz_attempts (status)",
    ],
  })
  app.save(attempts)

  const responses = new Collection({
    name: "quiz_responses", type: "base",
    listRule: `${AUTH} && ${STAFF}`, viewRule: `${AUTH} && ${STAFF}`,
    createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "relation", name: "attempt", required: true, collectionId: attempts.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "question", collectionId: questions.id, maxSelect: 1 },
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "user", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: "json", name: "answer", maxSize: 20000 },
      { type: "bool", name: "is_correct" },
      { type: "number", name: "points_awarded", min: 0 },
      { type: "number", name: "points_possible", min: 0 },
      { type: "bool", name: "needs_review" },
      { type: "text", name: "feedback", max: 2000 },
      { type: "relation", name: "graded_by", collectionId: users.id, maxSelect: 1 },
      { type: "date", name: "graded_at" },
      ...ts,
    ],
    indexes: ["CREATE UNIQUE INDEX idx_responses_unique ON quiz_responses (attempt, question)"],
  })
  app.save(responses)

  // ---- Assignments (1:1 with an activity of type assignment) ----
  const assignments = new Collection({
    name: "assignments", type: "base",
    listRule: `${AUTH} && (${STAFF} || (${ACT_VISIBLE} && ${ENROLLED("course")}))`,
    viewRule: `${AUTH} && (${STAFF} || (${ACT_VISIBLE} && ${ENROLLED("course")}))`,
    createRule: `${AUTH} && ${STAFF} && activity.course = course && activity.type = "assignment"`,
    updateRule: `${AUTH} && ${STAFF} && @request.body.course:isset = false && @request.body.activity:isset = false`,
    deleteRule: `${AUTH} && ${STAFF}`,
    fields: [
      { type: "relation", name: "activity", required: true, collectionId: activities.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "date", name: "due_at" },
      { type: "date", name: "cutoff_at" },
      { type: "bool", name: "allow_late" },
      { type: "number", name: "max_marks", min: 0, max: 10000 },
      { type: "number", name: "pass_marks", min: 0, max: 10000 },
      { type: "select", name: "submission_type", required: true, values: ["text", "file", "text_and_file"], maxSelect: 1 },
      { type: "text", name: "allowed_extensions", max: 300 },
      { type: "number", name: "max_file_mb", min: 1, max: 50, onlyInt: true },
      { type: "number", name: "max_files", min: 1, max: 10, onlyInt: true },
      { type: "number", name: "max_submissions", min: 0, max: 100, onlyInt: true },
      ...ts,
    ],
    indexes: ["CREATE UNIQUE INDEX idx_assignments_activity ON assignments (activity)"],
  })
  app.save(assignments)

  const submissions = new Collection({
    name: "submissions", type: "base",
    listRule: `${AUTH} && (user = @request.auth.id || ${STAFF})`,
    viewRule: `${AUTH} && (user = @request.auth.id || ${STAFF})`,
    createRule: null, updateRule: null, deleteRule: `${AUTH} && ${P("courses.manage_all")}`,
    fields: [
      { type: "relation", name: "assignment", required: true, collectionId: assignments.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "activity", required: true, collectionId: activities.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "user", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: "number", name: "number", min: 1, onlyInt: true },
      { type: "text", name: "text", max: 20000 },
      { type: "file", name: "files", maxSelect: 10, maxSize: 52428800, protected: true, mimeTypes: FILE_TYPES },
      { type: "json", name: "file_meta", maxSize: 20000 },
      { type: "date", name: "submitted_at" },
      { type: "bool", name: "is_late" },
      { type: "bool", name: "is_latest" },
      { type: "select", name: "status", required: true, values: ["submitted", "graded"], maxSelect: 1 },
      { type: "number", name: "grade", min: 0 },
      { type: "text", name: "feedback", max: 5000 },
      { type: "relation", name: "graded_by", collectionId: users.id, maxSelect: 1 },
      { type: "date", name: "graded_at" },
      ...ts,
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_submissions_unique ON submissions (assignment, user, number)",
      "CREATE INDEX idx_submissions_course ON submissions (course)",
    ],
  })
  app.save(submissions)

  // ---- Announcements ----
  const announcements = new Collection({
    name: "announcements", type: "base",
    listRule: `${AUTH} && (${STAFF} || (published = true && course.status != "draft" && ${ENROLLED("course")}))`,
    viewRule: `${AUTH} && (${STAFF} || (published = true && course.status != "draft" && ${ENROLLED("course")}))`,
    createRule: `${AUTH} && ${STAFF} && author = @request.auth.id`,
    updateRule: `${AUTH} && ${STAFF} && @request.body.course:isset = false && @request.body.author:isset = false`,
    deleteRule: `${AUTH} && ${STAFF}`,
    fields: [
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "author", required: true, collectionId: users.id, maxSelect: 1 },
      { type: "text", name: "title", required: true, max: 200 },
      { type: "editor", name: "body", maxSize: 100000 },
      { type: "bool", name: "pinned" },
      { type: "bool", name: "published" },
      ...ts,
    ],
    indexes: ["CREATE INDEX idx_announcements_course ON announcements (course)"],
  })
  app.save(announcements)

  // ---- Discussions ----
  const topicRead = `${AUTH} && (${STAFF} || (course.status != "draft" && ${ENROLLED("course")}))`
  const topics = new Collection({
    name: "discussion_topics", type: "base",
    listRule: topicRead, viewRule: topicRead,
    createRule: `${AUTH} && author = @request.auth.id && @request.body.reply_count:isset = false && @request.body.last_activity_at:isset = false && (${STAFF} || (course.status != "draft" && @request.body.pinned:isset = false && @request.body.locked:isset = false && ${ENROLLED("course")}))`,
    updateRule: `${AUTH} && @request.body.course:isset = false && @request.body.author:isset = false && @request.body.reply_count:isset = false && @request.body.last_activity_at:isset = false && (${STAFF} || (author = @request.auth.id && locked = false && @request.body.pinned:isset = false && @request.body.locked:isset = false && ${ENROLLED("course")}))`,
    deleteRule: `${AUTH} && (${STAFF} || (author = @request.auth.id && ${ENROLLED("course")}))`,
    fields: [
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "author", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "title", required: true, max: 200 },
      { type: "text", name: "body", required: true, max: 10000 },
      { type: "bool", name: "pinned" },
      { type: "bool", name: "locked" },
      { type: "number", name: "reply_count", min: 0, onlyInt: true },
      { type: "date", name: "last_activity_at" },
      ...ts,
    ],
    indexes: ["CREATE INDEX idx_topics_course ON discussion_topics (course)"],
  })
  app.save(topics)

  const replies = new Collection({
    name: "discussion_replies", type: "base",
    listRule: topicRead, viewRule: topicRead,
    createRule: `${AUTH} && author = @request.auth.id && topic.course = course && (${STAFF} || (topic.locked = false && course.status != "draft" && ${ENROLLED("course")}))`,
    updateRule: `${AUTH} && @request.body.course:isset = false && @request.body.topic:isset = false && @request.body.author:isset = false && (${STAFF} || (author = @request.auth.id && topic.locked = false && ${ENROLLED("course")}))`,
    deleteRule: `${AUTH} && (${STAFF} || (author = @request.auth.id && ${ENROLLED("course")}))`,
    fields: [
      { type: "relation", name: "topic", required: true, collectionId: topics.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "author", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "body", required: true, max: 10000 },
      { type: "bool", name: "edited" },
      ...ts,
    ],
    indexes: ["CREATE INDEX idx_replies_topic ON discussion_replies (topic)"],
  })
  app.save(replies)

  // ---- Notifications (server-created; users can only read / mark read / delete their own) ----
  const notifications = new Collection({
    name: "notifications", type: "base",
    listRule: `${AUTH} && user = @request.auth.id`,
    viewRule: `${AUTH} && user = @request.auth.id`,
    createRule: null,
    updateRule: `${AUTH} && user = @request.auth.id && @request.body.user:isset = false && @request.body.type:isset = false && @request.body.title:isset = false && @request.body.body:isset = false && @request.body.link:isset = false && @request.body.course:isset = false && @request.body.dedupe_key:isset = false`,
    deleteRule: `${AUTH} && user = @request.auth.id`,
    fields: [
      { type: "relation", name: "user", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: "select", name: "type", required: true, maxSelect: 1, values: ["announcement", "deadline", "assignment_graded", "quiz_result", "discussion_reply", "submission_received", "grading_needed"] },
      { type: "text", name: "title", required: true, max: 200 },
      { type: "text", name: "body", max: 1000 },
      { type: "text", name: "link", max: 300 },
      { type: "relation", name: "course", collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "bool", name: "read" },
      { type: "date", name: "read_at" },
      { type: "text", name: "dedupe_key", max: 200 },
      ...ts,
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_notifications_dedupe ON notifications (user, dedupe_key) WHERE dedupe_key != ''",
      "CREATE INDEX idx_notifications_user_read ON notifications (user, read)",
    ],
  })
  app.save(notifications)

  // ---- Settings: email notifications switch (delivery reserved for a later stage) ----
  const settings = app.findCollectionByNameOrId("site_settings")
  settings.fields.add(new BoolField({ name: "email_notifications" }))
  app.save(settings)
}, (app) => {
  for (const n of ["notifications", "discussion_replies", "discussion_topics", "announcements", "submissions", "assignments", "quiz_responses", "quiz_attempts", "quiz_questions", "quizzes", "questions", "question_categories"]) {
    try { app.delete(app.findCollectionByNameOrId(n)) } catch (_) {}
  }
  const settings = app.findCollectionByNameOrId("site_settings")
  settings.fields.removeByName("email_notifications")
  app.save(settings)
})
