import type { RecordModel } from "pocketbase";

export type Permission =
  | "users.manage"
  | "roles.manage"
  | "settings.manage"
  | "system.view"
  | "categories.manage"
  | "courses.manage_all"
  | "courses.create"
  | "courses.teach"
  | "enrollments.manage_all"
  | "courses.enroll";

export type DashboardKind = "admin" | "instructor" | "student";

export interface Role extends RecordModel {
  name: string;
  slug: string;
  description: string;
  permissions: Permission[];
  dashboard: DashboardKind;
  is_system: boolean;
}

export interface User extends RecordModel {
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  avatar: string;
  role: string;
  status: "active" | "inactive";
  headline: string;
  bio: string;
  phone: string;
  last_login: string;
  verified: boolean;
  must_change_password: boolean;
  created: string;
  updated: string;
  expand?: { role?: Role };
}

export interface Category extends RecordModel {
  name: string;
  slug: string;
  description: string;
  parent: string;
  sort_order: number;
  expand?: { parent?: Category };
}

export type CourseStatus = "draft" | "published" | "archived";
export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all_levels" | "";

export interface Course extends RecordModel {
  title: string;
  slug: string;
  summary: string;
  description: string;
  thumbnail: string;
  category: string;
  owner: string;
  instructors: string[];
  status: CourseStatus;
  level: CourseLevel;
  self_enrollment: boolean;
  estimated_hours: number;
  created: string;
  updated: string;
  expand?: { category?: Category; instructors?: User[]; owner?: User };
}

export interface Section extends RecordModel {
  course: string;
  title: string;
  summary: string;
  sort_order: number;
  is_published: boolean;
}

export type ActivityType = "lesson" | "quiz" | "assignment";
export type CompletionMode = "manual" | "view" | "none" | "submit" | "pass";

export interface Activity extends RecordModel {
  course: string;
  section: string;
  type: ActivityType;
  title: string;
  description: string;
  content: string;
  sort_order: number;
  is_published: boolean;
  completion_mode: CompletionMode;
  estimated_minutes: number;
  config: Record<string, unknown> | null;
}

export interface Material extends RecordModel {
  course: string;
  activity: string;
  kind: "file" | "link";
  title: string;
  description: string;
  file: string;
  url: string;
  sort_order: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created: string;
}

export type CompletionStatus = "not_started" | "in_progress" | "completed" | "";

export interface Enrollment extends RecordModel {
  user: string;
  course: string;
  status: "active" | "suspended";
  method: "manual" | "self" | "";
  enrolled_by: string;
  completion_status: CompletionStatus;
  progress: number;
  completed_count: number;
  total_count: number;
  completed_at: string;
  last_accessed: string;
  last_activity: string;
  created: string;
  expand?: { user?: User; course?: Course; last_activity?: Activity };
}

export interface ActivityProgress extends RecordModel {
  user: string;
  course: string;
  activity: string;
  completed: boolean;
  completed_at: string;
  first_accessed: string;
  last_accessed: string;
  view_count: number;
}

export interface ActivityLog extends RecordModel {
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  description: string;
  created: string;
  expand?: { actor?: User };
}

export interface SiteSettings extends RecordModel {
  site_name: string;
  tagline: string;
  description: string;
  support_email: string;
  logo: string;
  favicon: string;
  default_language: string;
  timezone: string;
  allow_registration: boolean;
  require_email_verification: boolean;
  allow_self_enrollment: boolean;
  default_self_enrollment: boolean;
  max_upload_mb: number;
  footer_text: string;
  email_notifications: boolean;
}
