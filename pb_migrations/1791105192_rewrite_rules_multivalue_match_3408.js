migrate((app) => {
  // Multi-value matching that works on this PocketBase build:
  //  - role permissions (multi-select): exact quoted contains  ~ '"perm"'
  //  - instructors (multi-relation): expand via .id  -> instructors.id ?= X
  const P = (perm) => `@request.auth.role.permissions ~ '"${perm}"'`
  const AUTH = `@request.auth.id != ""`
  const ENROLLED = (courseExpr) =>
    `(@collection.enrollments.user ?= @request.auth.id && @collection.enrollments.course ?= ${courseExpr} && @collection.enrollments.status ?= "active")`
  const TEACHES_CHILD = `(course.owner = @request.auth.id || course.instructors.id ?= @request.auth.id)`
  const CHILD_STAFF = `(${P("courses.manage_all")} || (${P("courses.teach")} && ${TEACHES_CHILD}))`
  const ENR_STAFF = `(${P("enrollments.manage_all")} || (${P("courses.teach")} && ${TEACHES_CHILD}))`
  const TEACHES = `(owner = @request.auth.id || instructors.id ?= @request.auth.id)`
  const COURSE_STAFF = `(${P("courses.manage_all")} || (${P("courses.teach")} && ${TEACHES}))`

  const set = (name, rules) => {
    const c = app.findCollectionByNameOrId(name)
    for (const k in rules) c[k] = rules[k]
    app.save(c)
  }

  const courseRead = `status = "published" || (${AUTH} && (${COURSE_STAFF} || (status = "archived" && ${ENROLLED("id")})))`
  set("courses", {
    listRule: courseRead,
    viewRule: courseRead,
    createRule: `${AUTH} && (${P("courses.manage_all")} || (${P("courses.create")} && owner = @request.auth.id))`,
    updateRule: `${AUTH} && (${P("courses.manage_all")} || (${P("courses.teach")} && ${TEACHES} && @request.body.owner:isset = false && @request.body.instructors:isset = false))`,
    deleteRule: `${AUTH} && (${P("courses.manage_all")} || (${P("courses.teach")} && owner = @request.auth.id && status != "published"))`,
  })
  const sectionRead = `(is_published = true && course.status != "draft") || (${AUTH} && ${CHILD_STAFF})`
  set("course_sections", {
    listRule: sectionRead,
    viewRule: sectionRead,
    createRule: `${AUTH} && ${CHILD_STAFF}`,
    updateRule: `${AUTH} && ${CHILD_STAFF} && @request.body.course:isset = false`,
    deleteRule: `${AUTH} && ${CHILD_STAFF}`,
  })
  const activityRead = `${AUTH} && (${CHILD_STAFF} || (is_published = true && section.is_published = true && course.status != "draft" && ${ENROLLED("course")}))`
  set("activities", {
    listRule: activityRead,
    viewRule: activityRead,
    createRule: `${AUTH} && ${CHILD_STAFF} && section.course = course`,
    updateRule: `${AUTH} && ${CHILD_STAFF} && @request.body.course:isset = false && @request.body.section:isset = false`,
    deleteRule: `${AUTH} && ${CHILD_STAFF}`,
  })
  const materialRead = `${AUTH} && (${CHILD_STAFF} || (activity.is_published = true && activity.section.is_published = true && course.status != "draft" && ${ENROLLED("course")}))`
  set("materials", {
    listRule: materialRead,
    viewRule: materialRead,
    createRule: `${AUTH} && ${CHILD_STAFF} && activity.course = course`,
    updateRule: `${AUTH} && ${CHILD_STAFF} && @request.body.course:isset = false && @request.body.activity:isset = false`,
    deleteRule: `${AUTH} && ${CHILD_STAFF}`,
  })
  const ownOrStaff = `${AUTH} && (user = @request.auth.id || ${ENR_STAFF})`
  set("enrollments", {
    listRule: ownOrStaff,
    viewRule: ownOrStaff,
    createRule: `${AUTH} && (${ENR_STAFF} || (${P("courses.enroll")} && @collection.site_settings.allow_self_enrollment ?= true && user = @request.auth.id && course.status = "published" && course.self_enrollment = true && status = "active" && method = "self" && @request.body.progress:isset = false && @request.body.completed_count:isset = false && @request.body.total_count:isset = false && @request.body.completion_status:isset = false && @request.body.completed_at:isset = false))`,
    updateRule: `${AUTH} && ${ENR_STAFF} && @request.body.user:isset = false && @request.body.course:isset = false && @request.body.progress:isset = false && @request.body.completed_count:isset = false && @request.body.total_count:isset = false && @request.body.completion_status:isset = false`,
    deleteRule: `${AUTH} && ${ENR_STAFF}`,
  })
  set("activity_progress", { listRule: ownOrStaff, viewRule: ownOrStaff })

  const userRead = `${AUTH} && (id = @request.auth.id || ${P("users.manage")} || role.permissions ~ '"courses.teach"' || (${P("courses.teach")} && @collection.enrollments.user ?= id && (@collection.enrollments.course.owner ?= @request.auth.id || @collection.enrollments.course.instructors.id ?= @request.auth.id)))`
  set("users", { listRule: userRead, viewRule: userRead })
}, (app) => {
  // Forward-only fix.
})
