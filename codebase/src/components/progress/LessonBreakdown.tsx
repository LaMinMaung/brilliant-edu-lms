import type { Activity, ActivityProgress, Enrollment } from "../../lib/types";
import { ProgressBar } from "../ui/Progress";

/** Per-lesson completion rate across active enrollments. */
export function LessonBreakdown({ activities, progress, enrollments }: { activities: Activity[]; progress: ActivityProgress[]; enrollments: Enrollment[] }) {
  const learners = new Set(enrollments.map((e) => e.user));
  const tracked = activities.filter((a) => a.is_published && a.completion_mode !== "none");
  if (!tracked.length) return <p className="py-6 text-center text-sm text-ink-3">No published, tracked lessons yet.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {tracked.map((a) => {
        const rows = progress.filter((p) => p.activity === a.id && learners.has(p.user));
        const done = rows.filter((p) => p.completed).length;
        const pct = learners.size ? (done / learners.size) * 100 : 0;
        return (
          <li key={a.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{a.title}</span>
              <span className="shrink-0 font-mono text-xs text-ink-3">{done}/{learners.size} done · {rows.length} opened</span>
            </div>
            <ProgressBar value={pct} size="sm" />
          </li>
        );
      })}
    </ul>
  );
}
