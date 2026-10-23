import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { useLoader } from "../../hooks/useLoader";
import { dueLabel, formatDateTime, isPast } from "../../lib/format";
import { listUpcomingAssignments } from "../../services/assignments";
import { Panel } from "../ui/Panel";
import { Loading } from "../ui/States";

/** Assignments due soon in the learner's courses (access rules limit the list to visible, enrolled courses). */
export function UpcomingDeadlines() {
  const data = useLoader(() => listUpcomingAssignments(6), []);
  const items = (data.data?.items || []).filter((a) => a.expand?.activity);
  return (
    <Panel title="Upcoming deadlines" bodyClassName="p-0">
      {data.loading ? <Loading /> : !items.length ? <p className="px-5 py-8 text-center text-sm text-ink-3">No assignments due soon.</p> : (
        <ul>
          {items.map((a) => (
            <li key={a.id} className="border-b border-rule last:border-0">
              <Link to={`/learn/courses/${a.course}/play/${a.activity}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper-2">
                <CalendarClock className={isPast(a.due_at) ? "size-4 text-brick" : "size-4 text-ink-3"} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.expand?.activity?.title}</span>
                  <span className="block truncate text-xs text-ink-3">{a.expand?.course?.title} · {formatDateTime(a.due_at)}</span>
                </span>
                <span className="whitespace-nowrap font-mono text-[11px] text-ink-3">{dueLabel(a.due_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
