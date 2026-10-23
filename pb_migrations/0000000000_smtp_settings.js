migrate((app) => {
  const settings = app.settings()
  settings.meta.appName = "Brilliant Edu LMS"
  settings.meta.appURL = "http://127.0.0.1:8090"
  settings.meta.senderAddress = "no-reply@example.com"

  settings.smtp.enabled = false
  settings.smtp.host = ""
  settings.smtp.port = 465
  settings.smtp.username = ""
  settings.smtp.password = ""
  settings.smtp.tls = true

  app.save(settings)
})
