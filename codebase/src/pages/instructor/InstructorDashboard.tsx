import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, LineChart, PlusCircle } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Panel } from "../../components/ui/Panel";
import { ButtonLink } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { CourseStatusBadge } from "../../components/ui/Badge";
import { ProgressBar } from "../../components/ui/Progress";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { displayName, timeAgo } from "../../lib/format";
import { listAllCourses } from "../../services/courses";
import { listAllEnrollments } from "../../services/enrollments";
import { getGradingQueue } from "../../services/grades";

export default function InstructorDashboard() {
  const { user, can } = useCurrentUser();
  const data = useLoader(async () => {
    const [courses, enrollments, queue] = await Promise.all([
      listAllCourses({ teacherId: user.id, sort: "-updated" }),
      listAllEnrollments({ teacherId: user.id }),
      getGradingQueue().catch(() => ({ items: [] })),
    ]);
    return { courses, enrollments, toGrade: queue.items.length };
  }, [user.id]);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  const courses = data.data?.courses;
  const enrollments = data.data?.enrollments;
  const students = enrollments ? new Set(enrollments.map((e) => e.user)).size : undefined;
  const perCourse = (id: string) => {
    const rows = (enrollments || []).filter((e) => e.course === id && e.status === "active");
    return { count: rows.length, avg: rows.length ? rows.reduce((n, e) => n + e.progress, 0) / rows.length : 0 };
  };
  const canCreate = can("courses.create") || can("courses.manage_all");

  return (
    <>
      <PageHeader eyebrow="Teaching" title={<>Welcome, <span className="marker">{user.first_name || displayName(user)}</span></>} description="Your courses, learners and how they're getting on."
        actions={canCreate && <ButtonLink to="/teach/courses/new" icon={<PlusCircle className="size-4" />}>Create course</ButtonLink>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="My courses" value={courses?.length} to="/teach/courses" emphasis />
        <StatCard label="Published" value={courses?.filter((c) => c.status === "published").length} />
        <StatCard label="Drafts" value={courses?.filter((c) => c.status === "draft").length} />
        <StatCard label="To grade" value={data.data?.toGrade} to="/teach/grading" hint="Submissions & quiz answers" />
        <StatCard label="Students" value={students} hint={enrollments ? `${enrollments.length} enrollments` : undefined} to="/teach/students" />
      </div>

      <nav aria-label="Shortcuts" className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ...(canCreate ? [{ to: "/teach/courses/new", label: "Create course", icon: PlusCircle }] : []),
          { to: "/teach/courses", label: "Edit courses & content", icon: BookOpen },
          { to: "/teach/students", label: "Manage students", icon: GraduationCap },
          { to: "/teach/progress", label: "View progress", icon: LineChart },
        ].map((s) => (
          <Link key={s.to} to={s.to} className="flex items-center gap-2 rounded-md border border-rule bg-paper-2 px-3 py-2.5 text-sm font-medium hover:border-ink-3 hover:bg-paper">
            <s.icon className="size-4 text-ink-3" aria-hidden /> {s.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="My courses" description="Enrollment and average progress per course." bodyClassName="p-0">
          {!courses ? <Loading /> : !courses.length ? (
            <div className="p-5"><EmptyState icon={<BookOpen className="size-5" />} title="No courses yet" message="Create your first course to start teaching." action={canCreate && <ButtonLink to="/teach/courses/new" size="sm">Create course</ButtonLink>} /></div>
          ) : (
            <ul>
              {courses.slice(0, 8).map((c) => {
                const s = perCourse(c.id);
                return (
                  <li key={c.id} className="border-b border-rule last:border-0">
                    <Link to={`/teach/courses/${c.id}`} className="grid gap-2 px-5 py-3.5 hover:bg-paper-2 sm:grid-cols-[1fr_160px_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-ink-3">{s.count} active learner{s.count === 1 ? "" : "s"}</p>
                      </div>
                      <ProgressBar value={s.avg} showLabel size="sm" />
                      <CourseStatusBadge status={c.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Recent enrollments" bodyClassName="p-0">
          {!enrollments ? <Loading /> : !enrollments.length ? <p className="px-5 py-8 text-center text-sm text-ink-3">No enrollments yet.</p> : (
            <ul>
              {enrollments.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-center gap-3 border-b border-rule px-5 py-3 last:border-0">
                  <Avatar user={e.expand?.user} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayName(e.expand?.user)}</p>
                    <p className="truncate text-xs text-ink-3">{e.expand?.course?.title}</p>
                  </div>
                  <span className="font-mono text-[11px] text-ink-3">{timeAgo(e.created)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
