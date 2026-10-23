migrate((app) => {
  const P = (perm) => `@request.auth.role.permissions ?= "${perm}"`
  const AUTH = `@request.auth.id != ""`
  const ENROLLED = (courseExpr) =>
    `(@collection.enrollments.user ?= @request.auth.id && @collection.enrollments.course ?= ${courseExpr} && @collection.enrollments.status ?= "active")`
  const CHILD_STAFF = `(${P("courses.manage_all")} || (${P("courses.teach")} && (course.owner = @request.auth.id || course.instructors ?= @request.auth.id)))`
  const ENR_STAFF = `(${P("enrollments.manage_all")} || (${P("courses.teach")} && (course.owner = @request.auth.id || course.instructors ?= @request.auth.id)))`
  const ts = [
    { type: "autodate", name: "created", onCreate: true, onUpdate: false },
    { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
  ]
  const PERMISSIONS = [
    "users.manage", "roles.manage", "settings.manage", "system.view",
    "categories.manage", "courses.manage_all", "courses.create", "courses.teach",
    "enrollments.manage_all", "courses.enroll",
  ]

  // ---------- App settings ----------
  const s = app.settings()
  s.meta.appName = "Brilliant Edu LMS"
  s.meta.senderName = "Brilliant Edu LMS"
  app.save(s)

  // ---------- Roles ----------
  const roles = new Collection({
    name: "roles",
    type: "base",
    listRule: AUTH,
    viewRule: AUTH,
    createRule: `${AUTH} && ${P("roles.manage")} && is_system = false`,
    updateRule: `${AUTH} && ${P("roles.manage")} && (is_system = false || (@request.body.slug:isset = false && @request.body.is_system:isset = false)) && (slug != "admin" || @request.body.permissions:isset = false)`,
    deleteRule: `${AUTH} && ${P("roles.manage")} && is_system = false`,
    fields: [
      { type: "text", name: "name", required: true, max: 80 },
      { type: "text", name: "slug", required: true, max: 60, pattern: "^[a-z0-9_-]+$" },
      { type: "text", name: "description", max: 500 },
      { type: "select", name: "permissions", values: PERMISSIONS, maxSelect: PERMISSIONS.length },
      { type: "select", name: "dashboard", required: true, values: ["admin", "instructor", "student"], maxSelect: 1 },
      { type: "bool", name: "is_system" },
      ...ts,
    ],
    indexes: ["CREATE UNIQUE INDEX idx_roles_slug ON roles (slug)"],
  })
  app.save(roles)

  const seedRole = (id, name, slug, description, permissions, dashboard) => {
    const r = new Record(roles)
    r.set("id", id)
    r.set("name", name)
    r.set("slug", slug)
    r.set("description", description)
    r.set("permissions", permissions)
    r.set("dashboard", dashboard)
    r.set("is_system", true)
    app.save(r)
  }
  seedRole("roleadmin000001", "Super Administrator", "admin", "Full access to every administrative function.", PERMISSIONS, "admin")
  seedRole("roleinstruct001", "Instructor", "instructor", "Creates and teaches courses, manages enrolled students.", ["courses.create", "courses.teach"], "instructor")
  seedRole("rolestudent0001", "Student", "student", "Browses the catalog, enrolls and learns.", ["courses.enroll"], "student")

  // ---------- Site settings (single record) ----------
  const settings = new Collection({
    name: "site_settings",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: `${AUTH} && ${P("settings.manage")}`,
    deleteRule: null,
    fields: [
      { type: "text", name: "site_name", required: true, max: 120 },
      { type: "text", name: "tagline", max: 240 },
      { type: "email", name: "support_email" },
      { type: "bool", name: "allow_registration" },
      { type: "bool", name: "require_email_verification" },
      { type: "bool", name: "default_self_enrollment" },
      { type: "number", name: "max_upload_mb", min: 1, max: 200, onlyInt: true },
      { type: "text", name: "footer_text", max: 300 },
      ...ts,
    ],
  })
  app.save(settings)
  const st = new Record(settings)
  st.set("id", "sitesettings001")
  st.set("site_name", "Brilliant Edu")
  st.set("tagline", "Learning, well organised.")
  st.set("allow_registration", true)
  st.set("require_email_verification", false)
  st.set("default_self_enrollment", true)
  st.set("max_upload_mb", 50)
  app.save(st)

  // ---------- Users: extend existing auth collection ----------
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new TextField({ name: "first_name", max: 80 }))
  users.fields.add(new TextField({ name: "last_name", max: 80 }))
  users.fields.add(new RelationField({ name: "role", required: true, collectionId: roles.id, maxSelect: 1 }))
  users.fields.add(new SelectField({ name: "status", required: true, values: ["active", "inactive"], maxSelect: 1 }))
  users.fields.add(new TextField({ name: "headline", max: 160 }))
  users.fields.add(new TextField({ name: "bio", max: 2000 }))
  users.fields.add(new TextField({ name: "phone", max: 40 }))
  users.fields.add(new DateField({ name: "last_login" }))
  users.fields.add(new JSONField({ name: "profile_extra", maxSize: 20000 }))
  app.save(users)

  // ---------- Categories ----------
  const categories = new Collection({
    name: "categories",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: `${AUTH} && ${P("categories.manage")}`,
    updateRule: `${AUTH} && ${P("categories.manage")}`,
    deleteRule: `${AUTH} && ${P("categories.manage")}`,
    fields: [
      { type: "text", name: "name", required: true, max: 120 },
      { type: "text", name: "slug", required: true, max: 120, pattern: "^[a-z0-9-]+$" },
      { type: "text", name: "description", max: 1000 },
      { type: "number", name: "sort_order", onlyInt: true },
      ...ts,
    ],
    indexes: ["CREATE UNIQUE INDEX idx_categories_slug ON categories (slug)"],
  })
  app.save(categories)
  categories.fields.add(new RelationField({ name: "parent", collectionId: categories.id, maxSelect: 1 }))
  app.save(categories)

  const tree = [
    ["Education", ["Mathematics", "Science", "Languages"]],
    ["Technology", ["Programming", "Networking", "Web Development"]],
  ]
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  tree.forEach(([parentName, children], pi) => {
    const p = new Record(categories)
    p.set("name", parentName)
    p.set("slug", slug(parentName))
    p.set("sort_order", pi)
    app.save(p)
    children.forEach((childName, ci) => {
      const c = new Record(categories)
      c.set("name", childName)
      c.set("slug", slug(childName))
      c.set("parent", p.id)
      c.set("sort_order", ci)
      app.save(c)
    })
  })

  // ---------- Courses (list/view rules applied after enrollments exists) ----------
  const COURSE_STAFF = `(${P("courses.manage_all")} || (${P("courses.teach")} && (owner = @request.auth.id || instructors ?= @request.auth.id)))`
  const courses = new Collection({
    name: "courses",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: `${AUTH} && (${P("courses.manage_all")} || (${P("courses.create")} && owner = @request.auth.id))`,
    updateRule: `${AUTH} && (${P("courses.manage_all")} || (${P("courses.teach")} && (owner = @request.auth.id || instructors ?= @request.auth.id) && @request.body.owner:isset = false && @request.body.instructors:isset = false))`,
    deleteRule: `${AUTH} && (${P("courses.manage_all")} || (${P("courses.teach")} && owner = @request.auth.id && status != "published"))`,
    fields: [
      { type: "text", name: "title", required: true, max: 200 },
      { type: "text", name: "slug", required: true, max: 200, pattern: "^[a-z0-9-]+$" },
      { type: "text", name: "summary", max: 400 },
      { type: "editor", name: "description", maxSize: 200000 },
      { type: "file", name: "thumbnail", maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"], thumbs: ["640x360", "160x90"] },
      { type: "relation", name: "category", collectionId: categories.id, maxSelect: 1 },
      { type: "relation", name: "owner", required: true, collectionId: users.id, maxSelect: 1 },
      { type: "relation", name: "instructors", collectionId: users.id, maxSelect: 20 },
      { type: "select", name: "status", required: true, values: ["draft", "published", "archived"], maxSelect: 1 },
      { type: "select", name: "level", values: ["beginner", "intermediate", "advanced", "all_levels"], maxSelect: 1 },
      { type: "bool", name: "self_enrollment" },
      { type: "number", name: "estimated_hours", min: 0, max: 10000 },
      { type: "json", name: "settings", maxSize: 20000 },
      ...ts,
    ],
    indexes: ["CREATE UNIQUE INDEX idx_courses_slug ON courses (slug)", "CREATE INDEX idx_courses_status ON courses (status)"],
  })
  app.save(courses)

  // ---------- Sections ----------
  const sections = new Collection({
    name: "course_sections",
    type: "base",
    listRule: `(is_published = true && course.status != "draft") || (${AUTH} && ${CHILD_STAFF})`,
    viewRule: `(is_published = true && course.status != "draft") || (${AUTH} && ${CHILD_STAFF})`,
    createRule: `${AUTH} && ${CHILD_STAFF}`,
    updateRule: `${AUTH} && ${CHILD_STAFF} && @request.body.course:isset = false`,
    deleteRule: `${AUTH} && ${CHILD_STAFF}`,
    fields: [
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "title", required: true, max: 200 },
      { type: "text", name: "summary", max: 1000 },
      { type: "number", name: "sort_order", onlyInt: true },
      { type: "bool", name: "is_published" },
      ...ts,
    ],
  })
  app.save(sections)

  // ---------- Activities (extensible: lesson now; quiz/assignment/etc later) ----------
  const activities = new Collection({
    name: "activities",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: `${AUTH} && ${CHILD_STAFF} && section.course = course`,
    updateRule: `${AUTH} && ${CHILD_STAFF} && @request.body.course:isset = false && @request.body.section:isset = false`,
    deleteRule: `${AUTH} && ${CHILD_STAFF}`,
    fields: [
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "section", required: true, collectionId: sections.id, maxSelect: 1, cascadeDelete: true },
      { type: "select", name: "type", required: true, values: ["lesson"], maxSelect: 1 },
      { type: "text", name: "title", required: true, max: 200 },
      { type: "text", name: "description", max: 1000 },
      { type: "editor", name: "content", maxSize: 500000 },
      { type: "number", name: "sort_order", onlyInt: true },
      { type: "bool", name: "is_published" },
      { type: "select", name: "completion_mode", required: true, values: ["manual", "view", "none"], maxSelect: 1 },
      { type: "number", name: "estimated_minutes", min: 0, max: 10000, onlyInt: true },
      { type: "json", name: "config", maxSize: 50000 },
      ...ts,
    ],
    indexes: ["CREATE INDEX idx_activities_course ON activities (course)"],
  })
  app.save(activities)

  // ---------- Learning materials ----------
  const materials = new Collection({
    name: "materials",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: `${AUTH} && ${CHILD_STAFF} && activity.course = course`,
    updateRule: `${AUTH} && ${CHILD_STAFF} && @request.body.course:isset = false && @request.body.activity:isset = false`,
    deleteRule: `${AUTH} && ${CHILD_STAFF}`,
    fields: [
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "activity", required: true, collectionId: activities.id, maxSelect: 1, cascadeDelete: true },
      { type: "select", name: "kind", required: true, values: ["file", "link"], maxSelect: 1 },
      { type: "text", name: "title", required: true, max: 200 },
      { type: "text", name: "description", max: 500 },
      {
        type: "file", name: "file", maxSelect: 1, maxSize: 52428800, protected: true,
        mimeTypes: [
          "application/pdf", "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.oasis.opendocument.text", "application/vnd.oasis.opendocument.presentation",
          "application/vnd.oasis.opendocument.spreadsheet", "application/rtf", "text/plain", "text/csv",
          "image/png", "image/jpeg", "image/gif", "image/webp", "application/zip",
        ],
      },
      { type: "url", name: "url" },
      { type: "number", name: "sort_order", onlyInt: true },
      ...ts,
    ],
  })
  app.save(materials)

  // ---------- Enrollments ----------
  const enrollments = new Collection({
    name: "enrollments",
    type: "base",
    listRule: `${AUTH} && (user = @request.auth.id || ${ENR_STAFF})`,
    viewRule: `${AUTH} && (user = @request.auth.id || ${ENR_STAFF})`,
    createRule: `${AUTH} && (${ENR_STAFF} || (${P("courses.enroll")} && user = @request.auth.id && course.status = "published" && course.self_enrollment = true && status = "active" && method = "self" && @request.body.progress:isset = false && @request.body.completed_count:isset = false && @request.body.total_count:isset = false && @request.body.completion_status:isset = false && @request.body.completed_at:isset = false))`,
    updateRule: `${AUTH} && ${ENR_STAFF} && @request.body.user:isset = false && @request.body.course:isset = false && @request.body.progress:isset = false && @request.body.completed_count:isset = false && @request.body.total_count:isset = false && @request.body.completion_status:isset = false`,
    deleteRule: `${AUTH} && ${ENR_STAFF}`,
    fields: [
      { type: "relation", name: "user", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "select", name: "status", required: true, values: ["active", "suspended"], maxSelect: 1 },
      { type: "select", name: "method", values: ["manual", "self"], maxSelect: 1 },
      { type: "relation", name: "enrolled_by", collectionId: users.id, maxSelect: 1 },
      { type: "select", name: "completion_status", values: ["not_started", "in_progress", "completed"], maxSelect: 1 },
      { type: "number", name: "progress", min: 0, max: 100 },
      { type: "number", name: "completed_count", min: 0, onlyInt: true },
      { type: "number", name: "total_count", min: 0, onlyInt: true },
      { type: "date", name: "completed_at" },
      { type: "date", name: "last_accessed" },
      { type: "relation", name: "last_activity", collectionId: activities.id, maxSelect: 1 },
      ...ts,
    ],
    indexes: ["CREATE UNIQUE INDEX idx_enrollments_user_course ON enrollments (user, course)"],
  })
  app.save(enrollments)

  // ---------- Deferred rules that reference enrollments ----------
  const c2 = app.findCollectionByNameOrId("courses")
  c2.listRule = `status = "published" || (${AUTH} && (${COURSE_STAFF} || (status = "archived" && ${ENROLLED("id")})))`
  c2.viewRule = c2.listRule
  app.save(c2)

  const a2 = app.findCollectionByNameOrId("activities")
  a2.listRule = `${AUTH} && (${CHILD_STAFF} || (is_published = true && section.is_published = true && course.status != "draft" && ${ENROLLED("course")}))`
  a2.viewRule = a2.listRule
  app.save(a2)

  const m2 = app.findCollectionByNameOrId("materials")
  m2.listRule = `${AUTH} && (${CHILD_STAFF} || (activity.is_published = true && activity.section.is_published = true && course.status != "draft" && ${ENROLLED("course")}))`
  m2.viewRule = m2.listRule
  app.save(m2)

  // ---------- Activity progress ----------
  const progress = new Collection({
    name: "activity_progress",
    type: "base",
    listRule: `${AUTH} && (user = @request.auth.id || ${ENR_STAFF})`,
    viewRule: `${AUTH} && (user = @request.auth.id || ${ENR_STAFF})`,
    createRule: `${AUTH} && user = @request.auth.id && activity.course = course && activity.is_published = true && (completed = false || activity.completion_mode != "none") && ${ENROLLED("course")}`,
    updateRule: `${AUTH} && user = @request.auth.id && @request.body.user:isset = false && @request.body.course:isset = false && @request.body.activity:isset = false && (@request.body.completed:isset = false || @request.body.completed = false || activity.completion_mode != "none") && ${ENROLLED("course")}`,
    deleteRule: `${AUTH} && ${P("enrollments.manage_all")}`,
    fields: [
      { type: "relation", name: "user", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "course", required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "activity", required: true, collectionId: activities.id, maxSelect: 1, cascadeDelete: true },
      { type: "bool", name: "completed" },
      { type: "date", name: "completed_at" },
      { type: "date", name: "first_accessed" },
      { type: "date", name: "last_accessed" },
      { type: "number", name: "view_count", min: 0, onlyInt: true },
      ...ts,
    ],
    indexes: ["CREATE UNIQUE INDEX idx_progress_user_activity ON activity_progress (user, activity)"],
  })
  app.save(progress)

  // ---------- Activity log (written by server hooks only) ----------
  const log = new Collection({
    name: "activity_log",
    type: "base",
    listRule: `${AUTH} && (${P("system.view")} || actor = @request.auth.id)`,
    viewRule: `${AUTH} && (${P("system.view")} || actor = @request.auth.id)`,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: "relation", name: "actor", collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "action", required: true, max: 80 },
      { type: "text", name: "target_type", max: 60 },
      { type: "text", name: "target_id", max: 60 },
      { type: "text", name: "description", max: 500 },
      ...ts,
    ],
  })
  app.save(log)

  // ---------- Users rules (set last: they reference other collections) ----------
  const u = app.findCollectionByNameOrId("users")
  u.listRule = `${AUTH} && (id = @request.auth.id || ${P("users.manage")} || role.permissions ?= "courses.teach" || (${P("courses.teach")} && @collection.enrollments.user ?= id && (@collection.enrollments.course.owner ?= @request.auth.id || @collection.enrollments.course.instructors ?= @request.auth.id)))`
  u.viewRule = u.listRule
  u.createRule = `${P("users.manage")} || (@request.body.role = "rolestudent0001" && @request.body.status = "active" && @collection.site_settings.allow_registration ?= true)`
  u.updateRule = `${AUTH} && (${P("users.manage")} || (id = @request.auth.id && @request.body.role:isset = false && @request.body.status:isset = false && @request.body.last_login:isset = false))`
  u.deleteRule = `${AUTH} && ${P("users.manage")} && id != @request.auth.id`
  u.manageRule = `${AUTH} && ${P("users.manage")}`
  u.authRule = `status = "active" && (verified = true || @collection.site_settings.require_email_verification ?= false)`
  u.resetPasswordTemplate = {
    subject: "Reset your {APP_NAME} password",
    body: `<p>Hello,</p><p>We received a request to reset your password. Click the button below to choose a new one.</p><p><a class="btn" href="{APP_URL}/reset-password?token={TOKEN}" target="_blank" rel="noopener">Reset password</a></p><p><i>If you didn't request this, you can safely ignore this email.</i></p><p>Thanks,<br/>{APP_NAME}</p>`,
  }
  u.verificationTemplate = {
    subject: "Verify your {APP_NAME} email",
    body: `<p>Hello,</p><p>Thanks for joining {APP_NAME}. Please confirm your email address.</p><p><a class="btn" href="{APP_URL}/verify-email?token={TOKEN}" target="_blank" rel="noopener">Verify email</a></p><p>Thanks,<br/>{APP_NAME}</p>`,
  }
  app.save(u)

}, (app) => {
  for (const name of ["activity_log", "activity_progress", "enrollments", "materials", "activities", "course_sections", "courses", "categories", "site_settings"]) {
    try { app.delete(app.findCollectionByNameOrId(name)) } catch (_) {}
  }
  const u = app.findCollectionByNameOrId("users")
  for (const f of ["first_name", "last_name", "role", "status", "headline", "bio", "phone", "last_login", "profile_extra"]) u.fields.removeByName(f)
  u.listRule = "id = @request.auth.id"
  u.viewRule = "id = @request.auth.id"
  u.createRule = ""
  u.updateRule = "id = @request.auth.id"
  u.deleteRule = "id = @request.auth.id"
  u.manageRule = null
  u.authRule = ""
  app.save(u)
  try { app.delete(app.findCollectionByNameOrId("roles")) } catch (_) {}
})
