migrate((app) => {
  // @request.auth.role.permissions is resolved as the raw JSON array text, so "?=" never matches.
  // Use an exact quoted-element contains match instead: ~ '"perm.key"'.
  const names = ["roles", "site_settings", "users", "categories", "courses", "course_sections", "activities", "materials", "enrollments", "activity_progress", "activity_log"]
  const re = /@request\.auth\.role\.permissions \?= "([a-z_.]+)"/g
  const fix = (rule) => (typeof rule === "string" ? rule.replace(re, "@request.auth.role.permissions ~ '\"$1\"'") : rule)
  for (const name of names) {
    const c = app.findCollectionByNameOrId(name)
    c.listRule = fix(c.listRule)
    c.viewRule = fix(c.viewRule)
    c.createRule = fix(c.createRule)
    c.updateRule = fix(c.updateRule)
    c.deleteRule = fix(c.deleteRule)
    if (c.type === "auth") c.manageRule = fix(c.manageRule)
    app.save(c)
  }
}, (app) => {
  const names = ["roles", "site_settings", "users", "categories", "courses", "course_sections", "activities", "materials", "enrollments", "activity_progress", "activity_log"]
  const re = /@request\.auth\.role\.permissions ~ '"([a-z_.]+)"'/g
  const back = (rule) => (typeof rule === "string" ? rule.replace(re, '@request.auth.role.permissions ?= "$1"') : rule)
  for (const name of names) {
    const c = app.findCollectionByNameOrId(name)
    c.listRule = back(c.listRule)
    c.viewRule = back(c.viewRule)
    c.createRule = back(c.createRule)
    c.updateRule = back(c.updateRule)
    c.deleteRule = back(c.deleteRule)
    if (c.type === "auth") c.manageRule = back(c.manageRule)
    app.save(c)
  }
})
