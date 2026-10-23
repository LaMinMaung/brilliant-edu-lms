import { Link } from "react-router-dom";
import { Users, BookOpen, FolderTree, UserPlus, ShieldCheck, Settings, ArrowUpRight } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Panel } from "../../components/ui/Panel";
import { Avatar } from "../../components/ui/Avatar";
import { CourseStatusBadge } from "../../components/ui/Badge";
import { Loading } from "../../components/ui/States";
import { ActivityFeed } from "../../components/dashboard/ActivityFeed";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { displayName, timeAgo } from "../../lib/format";
import { count, recentActivity } from "../../services/stats";
import { recentUsers } from "../../services/users";
import { listCourses } from "../../services/courses";

const QUICK = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/enrollments", label: "Enrollments", icon: UserPlus },
  { to: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminDashboard() {
  const { user } = useCurrentUser();
  const stats = useLoader(async () => {
    const [users, active, students, instructors, courses, published, drafts, categories, enrollments] = await Promise.all([
      count("users"),
      count("users", 'status = "active"'),
      count("users", 'role.dashboard = "student"'),
      count("users", `role.permissions ~ '"courses.teach"' && role.dashboard != "admin"`),
      count("courses"),
      count("courses", 'status = "published"'),
      count("courses", 'status = "draft"'),
      count("categories"),
      count("enrollments"),
    ]);
    return { users, active, students, instructors, courses, published, drafts, categories, enrollments };
  }, []);
  const people = useLoader(() => recentUsers(6), []);
  const courses = useLoader(() => listCourses({ perPage: 6, sort: "-created" }), []);
  const activity = useLoader(() => recentActivity(10), []);
  const s = stats.data;

  return (
    <>
      <PageHeader eyebrow="Administration" title={<>Good to see you, <span className="marker">{user.first_name || displayName(user)}</span></>} description="An overview of people, courses and activity across the platform." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total users" value={s?.users} hint={s ? `${s.active} active` : undefined} to="/admin/users" emphasis />
        <StatCard label="Students" value={s?.students} to="/admin/users" />
        <StatCard label="Instructors" value={s?.instructors} to="/admin/users" />
        <StatCard label="Enrollments" value={s?.enrollments} to="/admin/enrollments" />
        <StatCard label="Total courses" value={s?.courses} to="/admin/courses" emphasis />
        <StatCard label="Published" value={s?.published} to="/admin/courses" />
        <StatCard label="Drafts" value={s?.drafts} to="/admin/courses" />
        <StatCard label="Categories" value={s?.categories} to="/admin/categories" />
      </div>

      <nav aria-label="Quick navigation" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className="group flex items-center justify-between gap-2 rounded-md border border-rule bg-paper-2 px-3 py-2.5 text-sm font-medium hover:border-ink-3 hover:bg-paper">
            <span className="flex items-center gap-2"><q.icon className="size-4 text-ink-3" aria-hidden />{q.label}</span>
            <ArrowUpRight className="size-3.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
          </Link>
        ))}
      </nav>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Recent registrations" actions={<Link to="/admin/users" className="text-sm text-ink-2 hover:text-ink">All users</Link>} bodyClassName="p-0">
          {people.loading ? <Loading /> : (
            <ul>
              {(people.data?.items || []).map((u) => (
                <li key={u.id} className="border-b border-rule last:border-0">
                  <Link to={`/admin/users/${u.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper-2">
                    <Avatar user={u} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{displayName(u)}</p>
                      <p className="truncate text-xs text-ink-3">{u.expand?.role?.name}</p>
                    </div>
                    <span className="font-mono text-[11px] text-ink-3">{timeAgo(u.created)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent courses" actions={<Link to="/admin/courses" className="text-sm text-ink-2 hover:text-ink">All courses</Link>} bodyClassName="p-0">
          {courses.loading ? <Loading /> : courses.data?.items.length ? (
            <ul>
              {courses.data.items.map((c) => (
                <li key={c.id} className="border-b border-rule last:border-0">
                  <Link to={`/admin/courses/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="truncate text-xs text-ink-3">{c.expand?.category?.name || "Uncategorised"} · {timeAgo(c.created)}</p>
                    </div>
                    <CourseStatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-8 text-center text-sm text-ink-3">No courses yet. <Link to="/admin/courses/new" className="underline">Create the first one</Link>.</p>}
        </Panel>
      </div>

      <Panel title="System activity" description="Sign-ins, registrations, new courses and enrollments." className="mt-6">
        {activity.loading ? <Loading /> : <ActivityFeed items={activity.data?.items || []} />}
      </Panel>
    </>
  );
}
