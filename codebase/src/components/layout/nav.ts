import {
  LayoutDashboard, Users, BookOpen, FolderTree, UserPlus, ShieldCheck, Settings,
  PlusCircle, GraduationCap, LineChart, UserCircle, Library, Compass, TrendingUp, ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import type { DashboardKind } from "../../lib/types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Exact match only (dashboards, create pages). */
  end?: boolean;
  /** Paths that should not activate this item even though they share the prefix. */
  exclude?: string[];
}

export const NAV: Record<DashboardKind, NavItem[]> = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/courses", label: "Courses", icon: BookOpen },
    { to: "/admin/categories", label: "Categories", icon: FolderTree },
    { to: "/admin/enrollments", label: "Enrollments", icon: UserPlus },
    { to: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ],
  instructor: [
    { to: "/teach", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/teach/courses", label: "My Courses", icon: BookOpen, exclude: ["/teach/courses/new"] },
    { to: "/teach/courses/new", label: "Create Course", icon: PlusCircle, end: true },
    { to: "/teach/students", label: "Students", icon: GraduationCap },
    { to: "/teach/grading", label: "Grading", icon: ClipboardCheck },
    { to: "/teach/progress", label: "Course Progress", icon: LineChart },
    { to: "/profile", label: "Profile", icon: UserCircle },
  ],
  student: [
    { to: "/learn", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/learn/courses", label: "My Courses", icon: Library },
    { to: "/learn/catalog", label: "Course Catalog", icon: Compass },
    { to: "/learn/progress", label: "Progress", icon: TrendingUp },
    { to: "/profile", label: "Profile", icon: UserCircle },
  ],
};

export function isNavActive(item: NavItem, pathname: string) {
  if (item.end) return pathname === item.to;
  if (item.exclude?.some((p) => pathname === p)) return false;
  return pathname === item.to || pathname.startsWith(item.to + "/");
}
