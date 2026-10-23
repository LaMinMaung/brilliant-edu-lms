/// <reference path="../pb_data/types.d.ts" />

// Deployment-specific values (production URL, email sender) live in PocketBase
// server settings, not in source code. SMTP credentials are never returned.

routerAdd("GET", "/api/lms/config", (e) => {
  const role = $app.findRecordById("roles", e.auth.getString("role"));
  const perms = role.getStringSlice("permissions");
  let allowed = false;
  for (let i = 0; i < perms.length; i++) if (perms[i] === "settings.manage") allowed = true;
  if (!allowed) return e.json(403, { message: "You do not have permission to view configuration." });
  const s = $app.settings();
  return e.json(200, {
    appURL: s.meta.appURL,
    senderName: s.meta.senderName,
    senderAddress: s.meta.senderAddress,
    smtpEnabled: s.smtp.enabled,
    smtpHost: s.smtp.host,
  });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/lms/config", (e) => {
  const role = $app.findRecordById("roles", e.auth.getString("role"));
  const perms = role.getStringSlice("permissions");
  let allowed = false;
  for (let i = 0; i < perms.length; i++) if (perms[i] === "settings.manage") allowed = true;
  if (!allowed) return e.json(403, { message: "You do not have permission to change configuration." });

  const body = e.requestInfo().body || {};
  const appURL = String(body.appURL || "").trim().replace(/\/+$/, "");
  const senderName = String(body.senderName || "").trim();
  const senderAddress = String(body.senderAddress || "").trim();
  if (!/^https?:\/\/[a-z0-9.-]+(:\d+)?(\/.*)?$/i.test(appURL)) return e.json(400, { message: "Application URL must start with https:// (or http:// for testing)." });
  if (!senderName || senderName.length > 120) return e.json(400, { message: "Sender name is required (max 120 characters)." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderAddress)) return e.json(400, { message: "Sender address must be a valid email." });

  const s = $app.settings();
  s.meta.appURL = appURL;
  s.meta.senderName = senderName;
  s.meta.senderAddress = senderAddress;
  $app.save(s);

  try {
    const l = new Record($app.findCollectionByNameOrId("activity_log"));
    l.set("actor", e.auth.id);
    l.set("action", "settings.config_updated");
    l.set("target_type", "settings");
    l.set("target_id", "config");
    l.set("description", "Updated application URL / email sender");
    $app.save(l);
  } catch (err) {
    $app.logger().error("Config audit failed", "error", String(err));
  }
  return e.json(200, { appURL: appURL, senderName: senderName, senderAddress: senderAddress, smtpEnabled: s.smtp.enabled, smtpHost: s.smtp.host });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/lms/config/test-email", (e) => {
  const role = $app.findRecordById("roles", e.auth.getString("role"));
  const perms = role.getStringSlice("permissions");
  let allowed = false;
  for (let i = 0; i < perms.length; i++) if (perms[i] === "settings.manage") allowed = true;
  if (!allowed) return e.json(403, { message: "Not permitted." });
  const s = $app.settings();
  try {
    const message = new MailerMessage({
      from: { address: s.meta.senderAddress, name: s.meta.senderName },
      to: [{ address: e.auth.email() }],
      subject: s.meta.appName + ": test email",
      html: "<p>This is a test email from " + s.meta.appName + ". Outgoing email is working.</p>",
    });
    $app.newMailClient().send(message);
    return e.json(200, { sentTo: e.auth.email() });
  } catch (err) {
    $app.logger().error("Test email failed", "error", String(err));
    return e.json(502, { message: "The email could not be sent. Check the email configuration; details are in the server logs." });
  }
}, $apis.requireAuth("users"));
