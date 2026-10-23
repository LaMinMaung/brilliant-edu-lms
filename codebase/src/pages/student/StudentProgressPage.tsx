import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Panel } from "../../components/ui/Panel";
import { ProgressBar, ProgressRing } from "../../components/ui/Progress";
import { Badge, CompletionBadge } from "../../components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { ButtonLink } from "../../components/ui/Button";
import { playerPath } from "../../components/learning/ContinueCard";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { formatDate, timeAgo } from "../../lib/format";
import { myEnrollments } from "../../services/enrollments";

export default function StudentProgressPage() {
  const { user } = useCurrentUser();
  const data = useLoader(() => myEnrollments(user.id), [user.id]);
  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading />;
  const list = data.data.filter((e) => e.expand?.course);
  const done = list.reduce((n, e) => n + (e.completed_count || 0), 0);
  const total = list.reduce((n, e) => n + (e.total_count || 0), 0);
  const overall = total ? (done / total) * 100 : 0;
  const completed = list.filter((e) => e.completion_status === "completed");

  return (
    <>
      <PageHeader eyebrow="Learning" title="My progress" description="Lessons completed across all of your courses." />
      {!list.length ? (
        <EmptyState icon={<TrendingUp className="size-5" />} title="No progress yet" message="Enroll in a course and complete lessons to see your progress here." action={<ButtonLink to="/learn/catalog" size="sm">Browse catalog</ButtonLink>} />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-[auto_1fr]">
            <div className="flex items-center gap-5 rounded-lg border border-rule bg-paper p-5">
              <ProgressRing value={overall} size={110} label="of all lessons complete" />
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Overall</p>
                <p className="mt-1 font-display text-2xl font-semibold">{done} <span className="text-ink-3">/ {total}</span></p>
                <p className="text-sm text-ink-2">lessons completed</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <StatCard label="Courses" value={list.length} />
              <StatCard label="Completed" value={completed.length} emphasis />
              <StatCard label="In progress" value={list.filter((e) => e.completion_status === "in_progress").length} />
            </div>
          </div>
          <Panel title="By course" className="mt-6" bodyClassName="p-0">
            <ul>
              {list.map((e) => (
                <li key={e.id} className="grid gap-3 border-b border-rule px-5 py-4 last:border-0 md:grid-cols-[1fr_240px_140px] md:items-center">
                  <div className="min-w-0">
                    <Link to={e.status === "active" ? playerPath(e) : `/learn/catalog/${e.course}`} className="block truncate font-medium hover:underline">{e.expand?.course?.title}</Link>
                    <p className="text-xs text-ink-3">
                      Enrolled {formatDate(e.created)}
                      {e.last_accessed && ` · last active ${timeAgo(e.last_accessed)}`}
                      {e.completed_at && ` · completed ${formatDate(e.completed_at)}`}
                    </p>
                  </div>
                  <div>
                    <ProgressBar value={e.progress} showLabel />
                    <p className="mt-1 font-mono text-[11px] text-ink-3">{e.completed_count || 0} of {e.total_count || 0} lessons</p>
                  </div>
                  <div className="md:text-right">{e.status === "suspended" ? <Badge tone="danger">Suspended</Badge> : <CompletionBadge status={e.completion_status} />}</div>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </>
  );
}
