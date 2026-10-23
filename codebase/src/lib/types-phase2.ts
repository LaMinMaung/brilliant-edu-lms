import type { RecordModel } from "pocketbase";
import type { Activity, Course, User } from "./types";

// ---------------- Question bank & quizzes ----------------

export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

export interface Choice {
  id: string;
  text: string;
}

export interface QuestionCategory extends RecordModel {
  course: string;
  name: string;
  sort_order: number;
}

export interface Question extends RecordModel {
  course: string;
  category: string;
  type: QuestionType;
  prompt: string;
  choices: Choice[] | null;
  /** MC: correct choice ids · TF: "true" | "false" · SA: accepted answers */
  answer: string[] | string | null;
  multiple: boolean;
  case_sensitive: boolean;
  points: number;
  feedback: string;
  created: string;
  expand?: { category?: QuestionCategory };
}

export type ShowResults = "immediately" | "after_close" | "never";

export interface Quiz extends RecordModel {
  activity: string;
  course: string;
  time_limit_minutes: number;
  max_attempts: number;
  passing_score: number;
  shuffle_questions: boolean;
  shuffle_choices: boolean;
  available_from: string;
  available_until: string;
  show_results: ShowResults | "";
  show_correct_answers: boolean;
}

export interface QuizQuestion extends RecordModel {
  quiz: string;
  question: string;
  course: string;
  sort_order: number;
  points: number;
  expand?: { question?: Question };
}

export type AttemptStatus = "in_progress" | "needs_grading" | "graded";

export interface QuizAttemptRecord extends RecordModel {
  quiz: string;
  activity: string;
  course: string;
  user: string;
  attempt_number: number;
  status: AttemptStatus;
  started_at: string;
  deadline: string;
  submitted_at: string;
  score: number;
  max_score: number;
  percent: number;
  passed: boolean;
  auto_submitted: boolean;
  expand?: { user?: User };
}

/** Answer value sent to / returned by the quiz endpoints. */
export type AnswerValue = string[] | string | null;

export interface AttemptQuestion {
  id: string;
  type: QuestionType | "removed";
  prompt: string;
  points: number;
  multiple: boolean;
  choices: Choice[];
  answer: AnswerValue;
  response_id?: string;
  is_correct?: boolean;
  points_awarded?: number;
  needs_review?: boolean;
  grader_feedback?: string;
  correct?: AnswerValue;
  explanation?: string;
}

export interface AttemptPayload {
  attempt: {
    id: string;
    attempt_number: number;
    status: AttemptStatus;
    started_at: string;
    deadline: string;
    submitted_at: string;
    auto_submitted: boolean;
    score?: number;
    max_score?: number;
    percent?: number;
    passed?: boolean;
  };
  results_visible: boolean;
  key_visible: boolean;
  questions: AttemptQuestion[];
  server_time: string;
  student?: { id: string; name: string };
}

export interface QuizSummary {
  quiz: {
    id: string;
    time_limit_minutes: number;
    max_attempts: number;
    passing_score: number;
    available_from: string;
    available_until: string;
    show_results: ShowResults;
    show_correct_answers: boolean;
  };
  question_count: number;
  total_points: number;
  attempts: {
    id: string;
    attempt_number: number;
    status: AttemptStatus;
    started_at: string;
    submitted_at: string;
    auto_submitted: boolean;
    score?: number;
    max_score?: number;
    percent?: number;
    passed?: boolean;
  }[];
  in_progress_id: string;
  attempts_left: number | null;
  can_start: boolean;
  reason: string;
  results_visible: boolean;
  best_percent: number | null;
  is_staff: boolean;
}

// ---------------- Assignments ----------------

export type SubmissionType = "text" | "file" | "text_and_file";

export interface Assignment extends RecordModel {
  activity: string;
  course: string;
  due_at: string;
  cutoff_at: string;
  allow_late: boolean;
  max_marks: number;
  pass_marks: number;
  submission_type: SubmissionType;
  allowed_extensions: string;
  max_file_mb: number;
  max_files: number;
  max_submissions: number;
}

export interface Submission extends RecordModel {
  assignment: string;
  activity: string;
  course: string;
  user: string;
  number: number;
  text: string;
  files: string[];
  file_meta: { name: string; size: number }[] | null;
  submitted_at: string;
  is_late: boolean;
  is_latest: boolean;
  status: "submitted" | "graded";
  grade: number;
  feedback: string;
  graded_by: string;
  graded_at: string;
  expand?: { user?: User; graded_by?: User };
}

// ---------------- Announcements & discussions ----------------

export interface Announcement extends RecordModel {
  course: string;
  author: string;
  title: string;
  body: string;
  pinned: boolean;
  published: boolean;
  created: string;
  updated: string;
  expand?: { author?: User };
}

export interface DiscussionTopic extends RecordModel {
  course: string;
  author: string;
  title: string;
  body: string;
  pinned: boolean;
  locked: boolean;
  reply_count: number;
  last_activity_at: string;
  created: string;
  updated: string;
  expand?: { author?: User };
}

export interface DiscussionReply extends RecordModel {
  topic: string;
  course: string;
  author: string;
  body: string;
  edited: boolean;
  created: string;
  updated: string;
  expand?: { author?: User };
}

// ---------------- Notifications ----------------

export type NotificationType =
  | "announcement"
  | "deadline"
  | "assignment_graded"
  | "quiz_result"
  | "discussion_reply"
  | "submission_received"
  | "grading_needed";

export interface AppNotification extends RecordModel {
  user: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  course: string;
  read: boolean;
  read_at: string;
  created: string;
  expand?: { course?: Course };
}

// ---------------- Grades ----------------

export interface GradeColumn {
  activity_id: string;
  title: string;
  type: "quiz" | "assignment";
  published: boolean;
  max: number;
  due_at: string;
  passing: number;
  quiz_id?: string;
  assignment_id?: string;
  results_visible?: boolean;
}

export type GradeCellStatus = "none" | "missing" | "in_progress" | "submitted" | "needs_grading" | "graded";

export interface GradeCell {
  status: GradeCellStatus;
  score: number | null;
  max: number;
  percent: number | null;
  passed: boolean | null;
  late: boolean;
  needs_grading: boolean;
  attempts?: number;
  submission_id?: string;
}

export interface GradeRow {
  user: { id: string; name: string; email: string };
  cells: Record<string, GradeCell>;
  earned: number;
  possible: number;
  percent: number | null;
}

export interface Gradebook {
  course: { id: string; title: string };
  is_staff: boolean;
  columns: GradeColumn[];
  rows: GradeRow[];
}

export interface GradingQueueItem {
  kind: "submission" | "quiz_attempt";
  id: string;
  submitted_at: string;
  late: boolean;
  student: string;
  course_id: string;
  course: string;
  activity_id: string;
  activity: string;
}

export type { Activity };
