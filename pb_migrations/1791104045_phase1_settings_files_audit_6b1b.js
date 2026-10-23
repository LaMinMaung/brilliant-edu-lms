migrate((app) => {
  const P = (perm) => `@request.auth.role.permissions ?= "${perm}"`
  const AUTH = `@request.auth.id != ""`
  const ENR_STAFF = `(${P("enrollments.manage_all")} || (${P("courses.teach")} && (course.owner = @request.auth.id || course.instructors ?= @request.auth.id)))`

  // ---- Site settings: identity, locale, global switches ----
  const settings = app.findCollectionByNameOrId("site_settings")
  settings.fields.add(new TextField({ name: "description", max: 1000 }))
  settings.fields.add(new FileField({ name: "logo", maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] }))
  settings.fields.add(new FileField({ name: "favicon", maxSelect: 1, maxSize: 524288, mimeTypes: ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"] }))
  settings.fields.add(new SelectField({ name: "default_language", maxSelect: 1, values: ["en", "es", "fr", "de", "it", "pt", "nl", "pl", "ro", "bg", "el", "tr", "ar"] }))
  settings.fields.add(new TextField({ name: "timezone", max: 64 }))
  settings.fields.add(new BoolField({ name: "allow_self_enrollment" }))
  app.save(settings)
  const st = app.findRecordById("site_settings", "sitesettings001")
  st.set("description", "A learning platform for structured courses, lessons and progress tracking.")
  st.set("default_language", "en")
  st.set("timezone", "UTC")
  st.set("allow_self_enrollment", true)
  app.save(st)

  // ---- Users: forced password change flag ----
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new BoolField({ name: "must_change_password" }))
  users.updateRule = `${AUTH} && (${P("users.manage")} || (id = @request.auth.id && @request.body.role:isset = false && @request.body.status:isset = false && @request.body.last_login:isset = false && @request.body.must_change_password:isset = false))`
  app.save(users)
  try {
    const seeded = app.findAuthRecordByEmail("users", "admin@brilliant-edu.org")
    seeded.set("must_change_password", true)
    app.save(seeded)
  } catch (_) {}

  // ---- Materials: server-recorded file metadata ----
  const materials = app.findCollectionByNameOrId("materials")
  materials.fields.add(new TextField({ name: "original_name", max: 255 }))
  materials.fields.add(new TextField({ name: "mime_type", max: 120 }))
  materials.fields.add(new NumberField({ name: "size_bytes", min: 0, onlyInt: true }))
  materials.fields.add(new RelationField({ name: "uploaded_by", collectionId: users.id, maxSelect: 1 }))
  materials.addIndex("idx_materials_activity", false, "activity", "")
  app.save(materials)

  // ---- Enrollments: global self-enrollment switch enforced server-side ----
  const enrollments = app.findCollectionByNameOrId("enrollments")
  enrollments.createRule = `${AUTH} && (${ENR_STAFF} || (${P("courses.enroll")} && @collection.site_settings.allow_self_enrollment ?= true && user = @request.auth.id && course.status = "published" && course.self_enrollment = true && status = "active" && method = "self" && @request.body.progress:isset = false && @request.body.completed_count:isset = false && @request.body.total_count:isset = false && @request.body.completion_status:isset = false && @request.body.completed_at:isset = false))`
  enrollments.addIndex("idx_enrollments_course", false, "course", "")
  app.save(enrollments)

  // ---- Extra indexes for common queries ----
  const sections = app.findCollectionByNameOrId("course_sections")
  sections.addIndex("idx_sections_course", false, "course", "")
  app.save(sections)

  const progress = app.findCollectionByNameOrId("activity_progress")
  progress.addIndex("idx_progress_course_user", false, "course, user", "")
  app.save(progress)

  const log = app.findCollectionByNameOrId("activity_log")
  log.addIndex("idx_log_created", false, "created", "")
  log.addIndex("idx_log_action", false, "action", "")
  log.addIndex("idx_log_actor", false, "actor", "")
  app.save(log)

  const courses = app.findCollectionByNameOrId("courses")
  courses.addIndex("idx_courses_category", false, "category", "")
  app.save(courses)
}, (app) => {
  const settings = app.findCollectionByNameOrId("site_settings")
  for (const f of ["description", "logo", "favicon", "default_language", "timezone", "allow_self_enrollment"]) settings.fields.removeByName(f)
  app.save(settings)
  const users = app.findCollectionByNameOrId("users")
  users.fields.removeByName("must_change_password")
  app.save(users)
  const materials = app.findCollectionByNameOrId("materials")
  for (const f of ["original_name", "mime_type", "size_bytes", "uploaded_by"]) materials.fields.removeByName(f)
  materials.removeIndex("idx_materials_activity")
  app.save(materials)
})
