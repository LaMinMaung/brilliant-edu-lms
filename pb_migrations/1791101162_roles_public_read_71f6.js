migrate((app) => {
  const roles = app.findCollectionByNameOrId("roles")
  roles.listRule = ""
  roles.viewRule = ""
  app.save(roles)
}, (app) => {
  const roles = app.findCollectionByNameOrId("roles")
  roles.listRule = "@request.auth.id != \"\""
  roles.viewRule = "@request.auth.id != \"\""
  app.save(roles)
})
