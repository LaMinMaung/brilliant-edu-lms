import { Link } from "react-router-dom";
import { Compass, Library } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Panel } from "../../components/ui/Panel";
import { ButtonLink } from "../../components/ui/Button";
import { ProgressBar } from "../../components/ui/Progress";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { CourseCard, CourseGrid } from "../../components/courses/CourseCard";
import { ContinueCard, playerPath } from "../../components/learning/ContinueCard";
import { UpcomingDeadlines } from "../../components/learning/UpcomingDeadlines";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { displayName, timeAgo } from "../../lib/format";
import { myEnrollments } from "../../services/enrollments";
import { listCourses } from "../../services/courses";
import { countMyCompleted } from "../../services/progress";

export default function StudentDashboard() {
  const { user } = useCurrentUser();
  const data = useLoader(async () => {
    const [enrollments, catalog, lessonsDone] = await Promise.all([
      myEnrollments(user.id),
      listCourses({ status: "published", perPage: 12, sort: "-created" }),
      countMyCompleted(user.id),
    ]);
    const enrolledIds = new Set(enrollments.map((e) => e.course));
    return { enrollments, available: catalog.items.filter((c) => !enrolledIds.has(c.id)).slice(0, 3), lessonsDone };
  }, [user.id]);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading label="Loading your learning" />;
  const { enrollments, available, lessonsDone } = data.data;
  const active = enrollments.filter((e) => e.status === "active");
  const inProgress = active.filter((e) => e.completion_status !== "completed");
  const completed = active.filter((e) => e.completion_status === "completed");
  const recent = active.filter((e) => e.last_accessed).slice(0, 4);
  const resume = recent.find((e) => e.completion_status !== "completed") || inProgress[0];

  return (
    <>
      <PageHeader eyebrow="Learning" title={<>Hello, <span className="marker">{user.first_name || displayName(user)}</span></>} description="Here's where you are and what to study next." />

      {resume ? <ContinueCard enrollment={resume} /> : (
        <EmptyState icon={<Compass className="size-5" />} title={active.length ? "All caught up" : "Start your first course"}
          message={active.length ? "You've completed every course you're enrolled in. Find something new in the catalog." : "Browse the catalog and enroll in a course to begin."}
          action={<ButtonLink to="/learn/catalog" size="sm">Browse the catalog</ButtonLink>} />
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Enrolled" value={active.length} to="/learn/courses" />
        <StatCard label="In progress" value={inProgress.length} />
        <StatCard label="Completed" value={completed.length} emphasis />
        <StatCard label="Lessons done" value={lessonsDone} to="/learn/progress" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Courses in progress" actions={<Link to="/learn/courses" className="text-sm text-ink-2 hover:text-ink">All my courses</Link>} bodyClassName="p-0">
          {inProgress.length ? (
            <ul>
              {inProgress.slice(0, 6).map((e) => (
                <li key={e.id} className="border-b border-rule last:border-0">
                  <Link to={playerPath(e)} className="grid gap-2 px-5 py-3.5 hover:bg-paper-2 sm:grid-cols-[1fr_200px] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.expand?.course?.title}</p>
                      <p className="text-xs text-ink-3">{e.completed_count || 0}/{e.total_count || 0} lessons</p>
                    </div>
                    <ProgressBar value={e.progress} showLabel size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-8 text-center text-sm text-ink-3">Nothing in progress right now.</p>}
        </Panel>
        <Panel title="Recently accessed" bodyClassName="p-0">
          {recent.length ? (
            <ul>
              {recent.map((e) => (
                <li key={e.id} className="border-b border-rule last:border-0">
                  <Link to={playerPath(e)} className="flex items-center gap-3 px-5 py-3 hover:bg-paper-2">
                    <Library className="size-4 shrink-0 text-ink-3" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm">{e.expand?.course?.title}</span>
                    <span className="font-mono text-[11px] text-ink-3">{timeAgo(e.last_accessed)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-8 text-center text-sm text-ink-3">Courses you open will show up here.</p>}
        </Panel>
      </div>

      <div className="mt-6"><UpcomingDeadlines /></div>

      {available.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-xl font-semibold">Available courses</h2>
            <Link to="/learn/catalog" className="text-sm text-ink-2 hover:text-ink">Full catalog</Link>
          </div>
          <CourseGrid>{available.map((c) => <CourseCard key={c.id} course={c} to={`/learn/catalog/${c.id}`} />)}</CourseGrid>
        </section>
      )}
    </>
  );
}
