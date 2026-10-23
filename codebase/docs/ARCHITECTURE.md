# Brilliant Edu LMS: Architecture (Phase 1)

## Database (PocketBase / SQLite)

All collections have `created` / `updated` timestamps (autodate). Relations are enforced by
PocketBase (`cascadeDelete` where a child cannot exist without its parent).

| Collection | Purpose | Key fields & constraints |
|---|---|---|
| `roles` | Roles **and** their permissions | `name`, `slug` (unique), `permissions` (multi-select over a fixed permission vocabulary), `dashboard` (admin/instructor/student landing area), `is_system` (system roles can't be deleted or renamed; the admin role's permissions are locked) |
| `users` (auth) | Accounts & profiles | `email` (unique), bcrypt password, `verified`, `first_name`, `last_name`, `name` (derived), `avatar`, `role` → roles (required), `status` active/inactive, `headline`, `bio`, `phone`, `last_login`, `must_change_password`, `profile_extra` (JSON for future profile fields). `authRule`: status must be active (and verified if required by settings) |
| `site_settings` | Single-record system settings | name, tagline, description, support email, logo, favicon, default language, timezone, registration/verification/self-enrollment switches, upload limit, footer |
| `categories` | Course categories (tree) | `name`, `slug` (unique), `parent` → categories (self relation), `sort_order` |
| `courses` | Course information | `title`, `slug` (unique), `summary`, `description` (HTML), `thumbnail`, `category` → categories, `owner` → users (required), `instructors` → users (multi), `status` draft/published/archived, `level`, `self_enrollment`, `estimated_hours`, `settings` (JSON, future course options). Indexes: slug, status, category |
| `course_sections` | Sections / modules | `course` → courses (cascade), `title`, `summary`, `sort_order`, `is_published` |
| `activities` | **Extensible content items** (lesson today) | `course`, `section` (cascade), `type` (select: `lesson`; future: quiz, assignment, …), `title`, `description`, `content` (HTML), `completion_mode` manual/view/none, `estimated_minutes`, `is_published`, `sort_order`, `config` (JSON for type-specific settings) |
| `materials` | Learning materials (files & links) | `course`, `activity` (cascade), `kind` file/link, `title`, `description`, `file` (**protected**, MIME allow-list, 50 MB), `url`, plus server-set metadata `original_name`, `mime_type`, `size_bytes`, `uploaded_by` |
| `enrollments` | User ↔ course enrollment | `user`, `course` (cascade), **unique (user, course)**, `status` active/suspended, `method` manual/self, `enrolled_by`, `completion_status`, `progress` %, `completed_count`, `total_count`, `completed_at`, `last_accessed`, `last_activity` |
| `activity_progress` | Per-learner lesson completion | `user`, `course`, `activity` (cascade), **unique (user, activity)**, `completed`, `completed_at`, `first_accessed`, `last_accessed`, `view_count` |
| `activity_log` | Audit / activity records | `actor` → users, `action` (e.g. `course.published`), `target_type`, `target_id`, `description`. Written **only by the server** (create/update/delete rules are locked). Indexed by created, action, actor |

### How the requested entities map
* **Permissions / user roles**: permissions are a constrained vocabulary stored on each role. Each user has
  exactly one role (`users.role`). Adding a permission = new select value + rules that check it.
  If multi-role users are needed later, add a `user_roles` join collection and switch the rule expression
  to `@collection.user_roles...`. The UI already reads permissions through one helper (`can()`).
* **Course instructors**: `courses.instructors` multi-relation (+ `owner`). If per-instructor metadata is
  needed later (e.g. "teacher" vs "non-editing teacher"), introduce a `course_staff` collection.
* **Lesson completion / course progress**: `activity_progress` + cached aggregates on `enrollments`.
* **Files**: `materials`, attached to an activity and its course.

### Rule syntax notes (important when editing rules)
On this PocketBase build, `?=` does **not** expand bare multi-value fields. Use:
* role permissions of the signed-in user: `@request.auth.role.permissions ~ '"courses.teach"'`
  (quoted element match, so `courses.teach` can't partially match another key)
* multi-relations: `instructors.id ?= @request.auth.id`, `course.instructors.id ?= @request.auth.id`
* same in client filters: `instructors.id ?= {:id}`, `role.permissions ~ '"courses.teach"'`

The acceptance self-test (Admin → Settings) exercises these rules and will catch regressions.

## Progress logic (server-side, `pb_hooks/lms_core.pb.js`)
Progress = completed tracked activities ÷ published tracked activities
(published activity in a published section, `completion_mode != none`).
It is recalculated when a learner's progress changes or when lessons/sections are added, published,
unpublished or deleted. Learners **cannot** write `enrollments.progress` directly. Phase 2 can replace
the single `recompute` routine with rule-based completion (e.g. "pass quiz ≥ 80%").

## Adding a new activity type later (e.g. Quiz)
1. Migration: add `"quiz"` to `activities.type` values; add quiz-specific collections (questions, attempts).
2. Store type settings in `activities.config`.
3. Frontend: add an editor + player component and dispatch on `activity.type` in the lesson editor
   and course player.
4. Completion: set `activity_progress.completed` from the quiz result; course progress needs no change.

## Phase 2: assessment & collaboration
* Quizzes and assignments are **activity types**: they live in sections like lessons, use the same publishing,
  outline, player and progress. Type-specific settings live in `quizzes` / `assignments` (1:1 with the activity,
  created automatically by a hook when the activity is created).
* **Trusted endpoints** (`pb_hooks/lms_phase2.pb.js`, shared logic in `pb_hooks/lms_lib.js`) handle everything students
  must not control: starting attempts (server-fixed question/choice order, deadline), saving answers, grading,
  submission validation (deadline, cut-off, limits, file type/size), completion, notifications.
* Collections holding answer keys, attempts, responses and submissions are **write-locked** for clients; only course
  staff can read keys/attempts directly. Students receive redacted payloads that honour "show results" settings.
* Completion modes: `manual`, `view` (lessons; student-set), `submit`, `pass` (quiz/assignment; server-set only).
* Notifications are created server-side with a dedupe key (unique per user) so each event notifies once.
* Scheduled jobs: auto-submit expired attempts (every 2 min), assignment deadline reminders (hourly).

## Frontend modules (`src/`)
| Folder | Contents |
|---|---|
| `lib/` | types, permission vocabulary, formatting (locale/timezone), error mapping, HTML sanitiser |
| `services/` | all data access (one module per domain: auth, users, roles, categories, courses, curriculum, enrollments, progress, settings, stats, files) |
| `context/`, `hooks/` | auth/session, settings, toasts, data loader, current-user helpers |
| `components/ui` | design-system primitives (buttons, fields, tables, modals, badges, progress, states, breadcrumbs) |
| `components/*` | feature components: layout/nav, auth guards, courses, curriculum, materials, enrollments, progress, player, settings |
| `pages/` | route screens grouped by area: `auth`, `admin`, `courses` (shared admin/instructor), `instructor`, `student`, `player` |

## Security controls
* **AuthN**: bcrypt passwords (PocketBase), JWT session tokens; deactivation rotates the user's token key
  (instant sign-out everywhere); password change invalidates other sessions; forced password change
  for initial/admin-set passwords.
* **AuthZ**: every collection rule checks role permissions, ownership or active enrollment, so ID-based
  access returns 404. Self-updates cannot touch `role`, `status`, `last_login` or `must_change_password`.
* **CSRF**: the API uses `Authorization` header tokens, not cookies, so cross-site forms can't act as the user.
* **XSS**: React escapes output; instructor HTML is sanitised with DOMPurify before rendering;
  links forced to `rel="noopener noreferrer"`; only http(s) URLs accepted for links.
* **Injection**: all filters use parameter binding (`pb.filter(...)` / `{:param}` in hooks).
* **Files**: server-side MIME sniffing allow-list, size limits, protected storage with short-lived tokens.
* **Audit**: login, user create/update/(de)activate/password change/delete, course create/update/
  publish/unpublish/archive/delete, enrollment create/suspend/reactivate/remove, lesson completion,
  category/role/settings changes.
