# Phase 1 Report: Brilliant Edu LMS

## Acceptance test result
The built-in **acceptance self-test** (Admin → Settings → Acceptance self-test) runs the required workflow
through the real REST API with real tokens, access rules, hooks and database records, then deletes its
temporary data. Last run: **42 / 42 checks passed**.

| Area | Checks |
|---|---|
| Administrator | logs in · sees dashboard data · creates instructor · creates student · creates category · creates course · assigns instructor · publishes course · enrolls student · duplicate enrollment rejected |
| Instructor | logs in · sees assigned course (while draft, via instructor rule) · edits course · cannot take over ownership · creates section · creates 2 lessons · uploads material (server metadata recorded) · unsafe HTML upload rejected · publishes lessons · sees enrolled student |
| Student | logs in · dashboard shows enrolled course · opens course · sees sections · opens lessons · downloads material with access token · marks lesson 1 complete → **50%** · marks lesson 2 complete → **100%, completed** |
| Security | private file unreachable without token · cannot escalate own role · cannot write own progress · cannot create courses · other users' emails hidden · sees only own activity records · cannot enroll someone else · cannot self-enroll into invitation-only course |
| Audit | course.created, course.updated, course.published, enrollment.created, lesson.completed recorded |

The browser UI on top of these APIs was build-checked but not clicked through by automation; run the workflow
once manually in the UI as part of sign-off.

## Implemented in Phase 1
Authentication (register, login, logout, forgot/reset password, email verification, optional verification
requirement, forced password change for initial/admin-set passwords, deactivation with instant sign-out),
role-based access with editable roles and permissions, admin/instructor/student dashboards, user management
(search, filter, create, edit, activate/deactivate, set or email a password reset, enroll, activity),
categories (tree, reorder), courses (draft/publish/unpublish/archive/delete, instructors, category, thumbnail,
self-enrollment), sections, lessons (rich text, completion modes), file and link materials (protected,
validated, with metadata), manual and self-enrollment, server-side progress, course player, catalog with
search/filters/pagination, settings (name, description, logo, favicon, language, timezone, registration,
self-enrollment, upload limit, domain/app URL, email sender, test email, system info), audit log with a
review page, error boundary/empty/loading/error states, responsive layouts, deployment and architecture docs.

## Left for Phase 2 (by design)
Quizzes and question banks, assignments and grading/gradebook, discussions/forums, announcements,
messaging/notifications, advanced completion rules (prerequisites, conditional release, pass marks),
richer reporting/analytics, bulk user import (CSV), course duplication/backup, UI translation of interface text.

## Left for Phase 3 (by design)
Certificates, attendance, SCORM/xAPI, video hosting/streaming, live classes/video conferencing,
payments/e-commerce, multi-tenant organizations, mobile apps, AI features, enterprise automation/integrations (SSO/LTI).

## Known limitations
* **One role per user.** Multi-role users would need a `user_roles` join collection (see ARCHITECTURE.md).
* **Interface language.** The "default language" setting controls `<html lang>` and date formatting; UI text is English only.
* **Lessons can't be moved between sections** (they can be reordered within a section).
* **Changing your own email** from the profile page is not offered. An admin can change a user's email.
* **Per-file size limit is fixed at 50 MB** on the server; the setting can only lower it in the UI.
* **Rich-text editor** supports headings, lists, quotes, code, links and dividers; no inline image upload yet
  (attach images as materials).
* **Initial administrator provisioning** is manual: create the first LMS administrator through the PocketBase superuser dashboard as described in DEPLOYMENT.md. No default LMS password is included.

## Recommended next steps
1. Sign in as the admin, set a new password, then run the acceptance self-test from Settings.
2. Connect the production subdomain, enable SSL + HTTPS Enforce, set the Application URL, send a test email.
3. Enable PocketBase rate limits and scheduled backups.
4. Phase 2 kickoff: quiz activity type (uses `activities.type` + `config`), then assignments, then completion rules.
