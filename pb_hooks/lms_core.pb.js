/// <reference path="../pb_data/types.d.ts" />

// ---- Users: keep display name in sync; invalidate sessions on deactivation ----
onRecordCreate((e) => {
  const fn = e.record.getString("first_name").trim();
  const ln = e.record.getString("last_name").trim();
  if (fn || ln) e.record.set("name", (fn + " " + ln).trim());
  e.next();
}, "users");

onRecordUpdate((e) => {
  const fn = e.record.getString("first_name").trim();
  const ln = e.record.getString("last_name").trim();
  if (fn || ln) e.record.set("name", (fn + " " + ln).trim());
  const prev = e.record.original();
  if (prev && prev.getString("status") === "active" && e.record.getString("status") !== "active") {
    e.record.refreshTokenKey();
  }
  e.next();
}, "users");

// ---- Defaults for enrollments + course ownership ----
onRecordCreate((e) => {
  const r = e.record;
  const name = r.collection().name;
  if (name === "enrollments") {
    if (!r.getString("status")) r.set("status", "active");
    if (!r.getString("method")) r.set("method", "manual");
    r.set("completion_status", "not_started");
    r.set("progress", 0);
    r.set("completed_count", 0);
  }
  if (name === "courses") {
    const owner = r.getString("owner");
    const raw = r.getStringSlice("instructors");
    const list = [];
    for (let i = 0; i < raw.length; i++) list.push(raw[i]);
    if (owner && list.indexOf(owner) === -1) {
      list.push(owner);
      r.set("instructors", list);
    }
  }
  e.next();
}, "enrollments", "courses");

// ---- Materials: server-recorded metadata (never trusted from the client) ----
onRecordCreateRequest((e) => {
  const r = e.record;
  r.set("uploaded_by", e.auth ? e.auth.id : "");
  r.set("original_name", "");
  r.set("mime_type", "");
  r.set("size_bytes", 0);
  if (r.getString("kind") === "file") {
    try {
      const files = e.findUploadedFiles("file");
      if (files && files.length > 0) {
        const f = files[0];
        const original = String(f.originalName || f.name || "");
        const ext = original.indexOf(".") >= 0 ? original.split(".").pop().toLowerCase() : "";
        const types = {
          pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          odt: "application/vnd.oasis.opendocument.text", odp: "application/vnd.oasis.opendocument.presentation", ods: "application/vnd.oasis.opendocument.spreadsheet",
          rtf: "application/rtf", txt: "text/plain", csv: "text/csv", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
          gif: "image/gif", webp: "image/webp", zip: "application/zip",
        };
        r.set("original_name", original.slice(0, 255));
        r.set("size_bytes", f.size || 0);
        r.set("mime_type", types[ext] || "application/octet-stream");
      }
    } catch (err) {
      e.app.logger().warn("Material metadata capture failed", "error", String(err));
    }
  } else {
    r.set("file", null);
  }
  e.next();
}, "materials");

// ---- Track last login + log sign-in ----
onRecordAuthRequest((e) => {
  e.next();
  try {
    if (!e.authMethod) return;
    const u = e.app.findRecordById("users", e.record.id);
    u.set("last_login", new DateTime());
    e.app.save(u);
    const log = new Record(e.app.findCollectionByNameOrId("activity_log"));
    log.set("actor", u.id);
    log.set("action", "auth.login");
    log.set("target_type", "user");
    log.set("target_id", u.id);
    log.set("description", "Signed in");
    e.app.save(log);
  } catch (err) {
    e.app.logger().error("Auth tracking failed", "error", String(err));
  }
}, "users");

// ---- Audit: creations made through the API ----
onRecordCreateRequest((e) => {
  e.next();
  const app = e.app;
  function log(actor, action, type, id, desc) {
    const l = new Record(app.findCollectionByNameOrId("activity_log"));
    if (actor) l.set("actor", actor);
    l.set("action", action);
    l.set("target_type", type);
    l.set("target_id", id);
    l.set("description", String(desc).slice(0, 500));
    app.save(l);
  }
  try {
    const r = e.record;
    const name = r.collection().name;
    const actor = e.auth ? e.auth.id : "";
    if (name === "users") {
      const who = r.getString("name") || r.getString("email");
      if (actor && actor !== r.id) log(actor, "user.created", "user", r.id, "Created account for " + who);
      else log(r.id, "user.registered", "user", r.id, "Registered as " + who);
    } else if (name === "activity_progress" && r.getBool("completed")) {
      const a = app.findRecordById("activities", r.getString("activity"));
      log(r.getString("user"), "lesson.completed", "activity", a.id, "Completed lesson " + a.getString("title"));
    } else if (name === "categories") {
      log(actor, "category.created", "category", r.id, "Created category " + r.getString("name"));
    } else if (name === "roles") {
      log(actor, "role.created", "role", r.id, "Created role " + r.getString("name"));
    }
  } catch (err) {
    app.logger().error("Audit (create) failed", "error", String(err));
  }
}, "users", "activity_progress", "categories", "roles");

// ---- Audit + password-change flag on updates ----
onRecordUpdateRequest((e) => {
  const r = e.record;
  const name = r.collection().name;
  const prev = r.original();
  const actor = e.auth ? e.auth.id : "";
  const watched = {
    users: ["first_name", "last_name", "email", "role", "status", "headline", "phone", "bio", "avatar"],
    courses: ["title", "slug", "summary", "description", "category", "level", "self_enrollment", "instructors", "thumbnail", "estimated_hours"],
    roles: ["name", "description", "permissions", "dashboard"],
    site_settings: ["site_name", "tagline", "description", "support_email", "allow_registration", "require_email_verification", "allow_self_enrollment", "default_self_enrollment", "max_upload_mb", "footer_text", "logo", "favicon", "default_language", "timezone"],
  };
  const changed = [];
  const fields = watched[name] || [];
  for (let i = 0; i < fields.length; i++) {
    if (JSON.stringify(prev.get(fields[i])) !== JSON.stringify(r.get(fields[i]))) changed.push(fields[i]);
  }
  const prevStatus = prev.getString("status");
  const prevCompleted = prev.getBool("completed");
  let passwordChanged = false;
  if (name === "users") {
    const body = e.requestInfo().body || {};
    if (body.password !== undefined && String(body.password) !== "") {
      passwordChanged = true;
      // Admin-set passwords must be changed by the user at next sign-in.
      r.set("must_change_password", !!(actor && actor !== r.id));
    }
  }

  e.next();

  const app = e.app;
  function log(a, action, type, id, desc) {
    const l = new Record(app.findCollectionByNameOrId("activity_log"));
    if (a) l.set("actor", a);
    l.set("action", action);
    l.set("target_type", type);
    l.set("target_id", id);
    l.set("description", String(desc).slice(0, 500));
    app.save(l);
  }
  try {
    if (name === "users") {
      const who = r.getString("name") || r.getString("email");
      const self = actor === r.id;
      if (prevStatus !== r.getString("status")) log(actor, r.getString("status") === "active" ? "user.activated" : "user.deactivated", "user", r.id, (r.getString("status") === "active" ? "Activated " : "Deactivated ") + who);
      const other = changed.filter((f) => f !== "status");
      if (other.length) log(actor, "user.updated", "user", r.id, (self ? "Updated own profile" : "Updated " + who) + " (" + other.join(", ") + ")");
      if (passwordChanged) log(actor, "user.password_changed", "user", r.id, self ? "Changed own password" : "Set a new password for " + who);
    } else if (name === "courses") {
      const title = r.getString("title");
      const status = r.getString("status");
      if (prevStatus !== status) {
        const action = status === "published" ? "course.published" : status === "archived" ? "course.archived" : "course.unpublished";
        log(actor, action, "course", r.id, (status === "published" ? "Published " : status === "archived" ? "Archived " : "Unpublished ") + title);
      }
      if (changed.length) log(actor, "course.updated", "course", r.id, "Updated " + title + " (" + changed.join(", ") + ")");
    } else if (name === "activity_progress") {
      if (!prevCompleted && r.getBool("completed")) {
        const a = app.findRecordById("activities", r.getString("activity"));
        log(r.getString("user"), "lesson.completed", "activity", a.id, "Completed lesson " + a.getString("title"));
      }
    } else if (name === "enrollments") {
      if (prevStatus !== r.getString("status")) {
        const c = app.findRecordById("courses", r.getString("course"));
        const u = app.findRecordById("users", r.getString("user"));
        log(actor, r.getString("status") === "active" ? "enrollment.reactivated" : "enrollment.suspended", "enrollment", r.id,
          (r.getString("status") === "active" ? "Reactivated " : "Suspended ") + (u.getString("name") || u.email()) + " in " + c.getString("title"));
      }
    } else if (name === "roles" && changed.length) {
      log(actor, "role.updated", "role", r.id, "Updated role " + r.getString("name") + " (" + changed.join(", ") + ")");
    } else if (name === "site_settings" && changed.length) {
      log(actor, "settings.updated", "settings", r.id, "Updated settings (" + changed.join(", ") + ")");
    }
  } catch (err) {
    app.logger().error("Audit (update) failed", "error", String(err));
  }
}, "users", "courses", "activity_progress", "enrollments", "roles", "site_settings");

// ---- Audit: deletions ----
onRecordDeleteRequest((e) => {
  const r = e.record;
  const name = r.collection().name;
  const actor = e.auth ? e.auth.id : "";
  const label = r.getString("title") || r.getString("name") || r.getString("email");
  const courseId = r.getString("course");
  const userId = r.getString("user");
  e.next();
  try {
    let desc = "Deleted " + label;
    if (name === "enrollments") {
      let who = userId;
      let what = courseId;
      try { const u = e.app.findRecordById("users", userId); who = u.getString("name") || u.email(); } catch (_) {}
      try { what = e.app.findRecordById("courses", courseId).getString("title"); } catch (_) {}
      desc = "Removed enrollment of " + who + " from " + what;
    }
    const action = { users: "user.deleted", courses: "course.deleted", enrollments: "enrollment.deleted", categories: "category.deleted", roles: "role.deleted" }[name];
    const l = new Record(e.app.findCollectionByNameOrId("activity_log"));
    if (actor && !(name === "users" && actor === r.id)) l.set("actor", actor);
    l.set("action", action);
    l.set("target_type", name);
    l.set("target_id", r.id);
    l.set("description", desc.slice(0, 500));
    e.app.save(l);
  } catch (err) {
    e.app.logger().error("Audit (delete) failed", "error", String(err));
  }
}, "users", "courses", "enrollments", "categories", "roles");

// ---- After create: progress recompute + activity log ----
onRecordAfterCreateSuccess((e) => {
  e.next();
  const app = e.app;
  function recompute(courseId, userId, activityId) {
    if (!courseId) return;
    const acts = app.findRecordsByFilter("activities", "course = {:c} && is_published = true && section.is_published = true && completion_mode != 'none'", "", 0, 0, { c: courseId });
    const ids = {};
    for (let i = 0; i < acts.length; i++) ids[acts[i].id] = true;
    const total = acts.length;
    const ens = userId
      ? app.findRecordsByFilter("enrollments", "course = {:c} && user = {:u}", "", 0, 0, { c: courseId, u: userId })
      : app.findRecordsByFilter("enrollments", "course = {:c}", "", 0, 0, { c: courseId });
    for (let j = 0; j < ens.length; j++) {
      const en = ens[j];
      const progs = app.findRecordsByFilter("activity_progress", "course = {:c} && user = {:u} && completed = true", "", 0, 0, { c: courseId, u: en.getString("user") });
      let done = 0;
      for (let k = 0; k < progs.length; k++) if (ids[progs[k].getString("activity")]) done++;
      if (activityId) {
        en.set("last_accessed", new DateTime());
        en.set("last_activity", activityId);
      }
      const touched = !en.getDateTime("last_accessed").isZero();
      en.set("total_count", total);
      en.set("completed_count", done);
      en.set("progress", total > 0 ? Math.round((done * 100) / total) : 0);
      if (total > 0 && done >= total) {
        if (en.getString("completion_status") !== "completed") {
          en.set("completion_status", "completed");
          en.set("completed_at", new DateTime());
        }
      } else {
        en.set("completion_status", done > 0 || touched ? "in_progress" : "not_started");
        en.set("completed_at", "");
      }
      app.save(en);
    }
  }
  function log(actor, action, type, id, desc) {
    const l = new Record(app.findCollectionByNameOrId("activity_log"));
    if (actor) l.set("actor", actor);
    l.set("action", action);
    l.set("target_type", type);
    l.set("target_id", id);
    l.set("description", String(desc).slice(0, 500));
    app.save(l);
  }
  try {
    const r = e.record;
    const name = r.collection().name;
    if (name === "activity_progress") {
      recompute(r.getString("course"), r.getString("user"), r.getString("activity"));
    } else if (name === "enrollments") {
      recompute(r.getString("course"), r.getString("user"), "");
      const course = app.findRecordById("courses", r.getString("course"));
      log(r.getString("user"), "enrollment.created", "course", course.id, "Enrolled in " + course.getString("title") + (r.getString("method") === "self" ? " (self-enrolled)" : ""));
    } else if (name === "activities") {
      recompute(r.getString("course"), "", "");
    } else if (name === "courses") {
      log(r.getString("owner"), "course.created", "course", r.id, "Created course " + r.getString("title"));
    }
  } catch (err) {
    app.logger().error("After-create hook failed", "error", String(err));
  }
}, "activity_progress", "enrollments", "activities", "courses");

// ---- After update: progress recompute ----
onRecordAfterUpdateSuccess((e) => {
  e.next();
  const app = e.app;
  function recompute(courseId, userId, activityId) {
    if (!courseId) return;
    const acts = app.findRecordsByFilter("activities", "course = {:c} && is_published = true && section.is_published = true && completion_mode != 'none'", "", 0, 0, { c: courseId });
    const ids = {};
    for (let i = 0; i < acts.length; i++) ids[acts[i].id] = true;
    const total = acts.length;
    const ens = userId
      ? app.findRecordsByFilter("enrollments", "course = {:c} && user = {:u}", "", 0, 0, { c: courseId, u: userId })
      : app.findRecordsByFilter("enrollments", "course = {:c}", "", 0, 0, { c: courseId });
    for (let j = 0; j < ens.length; j++) {
      const en = ens[j];
      const progs = app.findRecordsByFilter("activity_progress", "course = {:c} && user = {:u} && completed = true", "", 0, 0, { c: courseId, u: en.getString("user") });
      let done = 0;
      for (let k = 0; k < progs.length; k++) if (ids[progs[k].getString("activity")]) done++;
      if (activityId) {
        en.set("last_accessed", new DateTime());
        en.set("last_activity", activityId);
      }
      const touched = !en.getDateTime("last_accessed").isZero();
      en.set("total_count", total);
      en.set("completed_count", done);
      en.set("progress", total > 0 ? Math.round((done * 100) / total) : 0);
      if (total > 0 && done >= total) {
        if (en.getString("completion_status") !== "completed") {
          en.set("completion_status", "completed");
          en.set("completed_at", new DateTime());
        }
      } else {
        en.set("completion_status", done > 0 || touched ? "in_progress" : "not_started");
        en.set("completed_at", "");
      }
      app.save(en);
    }
  }
  try {
    const r = e.record;
    const name = r.collection().name;
    if (name === "activity_progress") recompute(r.getString("course"), r.getString("user"), r.getString("activity"));
    else if (name === "activities" || name === "course_sections") recompute(r.getString("course"), "", "");
  } catch (err) {
    app.logger().error("After-update hook failed", "error", String(err));
  }
}, "activity_progress", "activities", "course_sections");

// ---- After delete: progress recompute ----
onRecordAfterDeleteSuccess((e) => {
  e.next();
  const app = e.app;
  function recompute(courseId) {
    if (!courseId) return;
    const acts = app.findRecordsByFilter("activities", "course = {:c} && is_published = true && section.is_published = true && completion_mode != 'none'", "", 0, 0, { c: courseId });
    const ids = {};
    for (let i = 0; i < acts.length; i++) ids[acts[i].id] = true;
    const total = acts.length;
    const ens = app.findRecordsByFilter("enrollments", "course = {:c}", "", 0, 0, { c: courseId });
    for (let j = 0; j < ens.length; j++) {
      const en = ens[j];
      const progs = app.findRecordsByFilter("activity_progress", "course = {:c} && user = {:u} && completed = true", "", 0, 0, { c: courseId, u: en.getString("user") });
      let done = 0;
      for (let k = 0; k < progs.length; k++) if (ids[progs[k].getString("activity")]) done++;
      const touched = !en.getDateTime("last_accessed").isZero();
      en.set("total_count", total);
      en.set("completed_count", done);
      en.set("progress", total > 0 ? Math.round((done * 100) / total) : 0);
      if (total > 0 && done >= total) {
        if (en.getString("completion_status") !== "completed") {
          en.set("completion_status", "completed");
          en.set("completed_at", new DateTime());
        }
      } else {
        en.set("completion_status", done > 0 || touched ? "in_progress" : "not_started");
        en.set("completed_at", "");
      }
      app.save(en);
    }
  }
  try {
    recompute(e.record.getString("course"));
  } catch (err) {
    app.logger().error("After-delete hook failed", "error", String(err));
  }
}, "activities", "course_sections");

// ---- System information (requires system.view) ----
routerAdd("GET", "/api/lms/system", (e) => {
  if (!e.auth) return e.json(401, { message: "Authentication required." });
  const role = $app.findRecordById("roles", e.auth.getString("role"));
  const perms = role.getStringSlice("permissions");
  let allowed = false;
  for (let i = 0; i < perms.length; i++) if (perms[i] === "system.view") allowed = true;
  if (!allowed) return e.json(403, { message: "You do not have permission to view system information." });
  const names = ["users", "roles", "categories", "courses", "course_sections", "activities", "materials", "enrollments", "activity_progress", "activity_log"];
  const counts = {};
  for (let i = 0; i < names.length; i++) counts[names[i]] = $app.countRecords(names[i]);
  const s = $app.settings();
  return e.json(200, {
    appName: s.meta.appName,
    appURL: s.meta.appURL,
    senderAddress: s.meta.senderAddress,
    smtpEnabled: s.smtp.enabled,
    serverTime: new Date().toISOString(),
    counts: counts,
  });
}, $apis.requireAuth("users"));

// ---- Teacher lookup of a user by exact email (requires courses.teach) ----
routerAdd("GET", "/api/lms/users/lookup", (e) => {
  if (!e.auth) return e.json(401, { message: "Authentication required." });
  const role = $app.findRecordById("roles", e.auth.getString("role"));
  const perms = role.getStringSlice("permissions");
  let allowed = false;
  for (let i = 0; i < perms.length; i++) if (perms[i] === "courses.teach" || perms[i] === "users.manage") allowed = true;
  if (!allowed) return e.json(403, { message: "Not permitted." });
  const email = String(e.request.url.query().get("email") || "").trim().toLowerCase();
  if (!email) return e.json(400, { message: "Email is required." });
  try {
    const u = $app.findAuthRecordByEmail("users", email);
    if (u.getString("status") !== "active") return e.json(404, { message: "No active user with that email." });
    return e.json(200, { id: u.id, name: u.getString("name"), email: u.email() });
  } catch (_) {
    return e.json(404, { message: "No active user with that email." });
  }
}, $apis.requireAuth("users"));
