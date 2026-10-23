import type { DashboardKind, Permission } from "./types";

export const STUDENT_ROLE_ID = "rolestudent0001";
export const SETTINGS_ID = "sitesettings001";

export const PERMISSION_GROUPS: { group: string; items: { key: Permission; label: string; hint: string }[] }[] = [
  {
    group: "Administration",
    items: [
      { key: "users.manage", label: "Manage users", hint: "Create, edit, deactivate users and assign roles" },
      { key: "roles.manage", label: "Manage roles", hint: "Create roles and edit their permissions" },
      { key: "settings.manage", label: "Manage settings", hint: "Change site-wide configuration" },
      { key: "system.view", label: "View system info", hint: "See system information and the activity log" },
    ],
  },
  {
    group: "Courses",
    items: [
      { key: "categories.manage", label: "Manage categories", hint: "Create, edit and organise categories" },
      { key: "courses.manage_all", label: "Manage all courses", hint: "Edit any course, assign instructors" },
      { key: "courses.create", label: "Create courses", hint: "Start new courses as owner" },
      { key: "courses.teach", label: "Teach courses", hint: "Edit assigned courses, manage their students" },
    ],
  },
  {
    group: "Enrollment",
    items: [
      { key: "enrollments.manage_all", label: "Manage all enrollments", hint: "Enroll anyone into any course" },
      { key: "courses.enroll", label: "Self-enroll", hint: "Join courses that allow self-enrollment" },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const DASHBOARD_HOME: Record<DashboardKind, string> = {
  admin: "/admin",
  instructor: "/teach",
  student: "/learn",
};

export const DASHBOARD_LABEL: Record<DashboardKind, string> = {
  admin: "Administration",
  instructor: "Teaching",
  student: "Learning",
};
