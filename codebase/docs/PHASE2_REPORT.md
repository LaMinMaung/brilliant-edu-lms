# Phase 2 Report: Learning Activities & Assessment

## 1. Implemented and verified

Verified **against the real backend** by the built-in acceptance self-test (Admin → Settings → Acceptance self-test),
which drives the REST API with real tokens, access rules, hooks and records, then deletes its temporary data.
Last run: **105 / 105 checks passed** (all Phase 1 checks plus 63 new Phase 2 checks).

| Area | What was verified end-to-end |
|---|---|
| Quizzes | Create quiz activity (settings record auto-created), configure pass mark/time limit/attempts/shuffle/visibility, question-bank category, MC + TF + SA questions, add questions to quiz, publish, student summary, start (no answer keys delivered), resume same attempt, autosave, submit, auto-grading incl. matching short answer, unmatched short answer queued for manual review, attempt limit enforced, grading queue, staff review with key, manual grading finalises attempt |
| Assignments | Create assignment (settings auto-created), due date/marks/file types/limits, text + file submission, disallowed file type rejected, resubmission tracked as #2 with history kept, submission limit enforced, grade > max rejected, grading with feedback, student sees own grade/feedback |
| Progress | Published quiz/assignment counted in course progress; passing a quiz / submitting an assignment completes it server-side (3/3 → 100 %, 3/4 → 4/4) |
| Gradebook | Staff gradebook shows quiz + assignment results; student sees only own row; non-enrolled user gets 404 |
| Announcements | Staff post; enrolled student notified exactly once; editing doesn't duplicate; students can't post; non-enrolled can't read |
| Discussions | Student topic; can't pin; instructor reply; reply count updates; topic author notified; can't edit others' replies; non-enrolled can't read; locked topic rejects student replies |
| Notifications | Quiz results, assignment grades, announcements, replies, new submissions (to staff); mark as read; content can't be altered; other users can't read |
| Security | Students can't read question bank/answer keys or quiz composition, can't read others' attempts/submissions/files, can't write submissions or grades, can't grade |

Frontend: **99 automated tests in 38 files, all passing** (services, quiz logic, and every Phase 2 component with behaviour).
Production build passes.

## 2. Partially implemented / not completed
* **Email delivery of notifications**: a setting exists (Settings → Notifications) but only in-app notifications are delivered.
* **Lint and TypeScript type-check** could not be run in this environment (only the Vite build and the test runner are available).
* **Deadline reminders** (hourly job) and **auto-submit of abandoned timed attempts** (every 2 min) run on the server
  scheduler; the same expiry logic is exercised whenever an attempt is opened, but the scheduled jobs themselves were not observed running.
* **Timer expiry through the UI** is unit-tested (countdown, server-offset, 409 fallback); a real timed attempt expiring was not run end-to-end.

## 3. Collections and migrations
Migration `1791791406_phase2_assessment_collab` (applied):
* **Changed:** `activities.type` (+quiz, assignment), `activities.completion_mode` (+submit, pass);
  `activity_progress` create/update rules (students can self-complete only manual/view lessons);
  `site_settings.email_notifications`.
* **New:** `question_categories`, `questions` (answer keys; staff only), `quizzes` (1:1 activity, unique),
  `quiz_questions` (unique quiz+question), `quiz_attempts` (unique quiz+user+attempt_number; server-written),
  `quiz_responses` (unique attempt+question; server-written), `assignments` (1:1 activity, unique),
  `submissions` (unique assignment+user+number; server-written; protected files), `announcements`,
  `discussion_topics`, `discussion_replies`, `notifications` (unique user+dedupe_key).

Server logic: `pb_hooks/lms_phase2.pb.js` (endpoints, event hooks, scheduled jobs) and `pb_hooks/lms_lib.js` (shared grading/notification module).
Endpoints: `/api/lms/quizzes/{activity}/summary|start`, `/api/lms/quiz-attempts/{id}[/answer|/submit]`,
`/api/lms/quiz-responses/{id}/grade`, `/api/lms/assignments/{activity}/submit`, `/api/lms/submissions/{id}/grade`,
`/api/lms/grades/{course}`, `/api/lms/grading/queue`.

## 4. Tests executed
* Backend acceptance self-test: 105/105 passed (two independent runs).
* Frontend `npm test` (Vitest + Testing Library, PocketBase mocked): 99/99 passed.
* `vite build`: passed.

## 5. Deployment / migration steps
1. Back up `pb_data/`.
2. Deploy `pb_migrations/` (new Phase 2 migration), `pb_hooks/lms_phase2.pb.js`, `pb_hooks/lms_lib.js` and the frontend build.
3. Restart PocketBase (pending migration applies automatically). Existing Phase 1 data is preserved.
4. Run Admin → Settings → Acceptance self-test.

**Important for future hook changes:** PocketBase rejects ambiguous route patterns at startup (e.g. `/quiz/attempts/{id}` and `/quiz/{id}/summary`). Keep each endpoint group under its own prefix.

## 6. Known limitations & next steps
* Partial credit is manual only (MC with multiple answers is all-or-nothing).
* Question bank is per course (no cross-course sharing or import/export yet).
* Discussion posts are plain text (safe by design); no attachments or threaded sub-replies.
* Gradebook totals weight all graded items by points; no weighted categories yet.
* Next: email notification delivery, gradebook weighting/categories, question import (CSV/GIFT), question pools/random selection, rubric grading, attempt time extensions for individual students.
