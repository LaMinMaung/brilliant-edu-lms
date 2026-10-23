migrate((app) => {
  // Remove the temporary verification account and any leftover self-test data.
  const del = (coll, filter) => {
    try {
      const rows = app.findRecordsByFilter(coll, filter, "", 0, 0, {})
      for (const r of rows) app.delete(r)
    } catch (_) {}
  }
  del("courses", "slug ~ 'selftest-'")
  del("categories", "slug ~ 'selftest-'")
  del("users", "email ~ 'lms-probe-' || email ~ 'lms-selftest-'")
  del("activity_log", "action = 'system.selftest'")
}, (app) => {})
