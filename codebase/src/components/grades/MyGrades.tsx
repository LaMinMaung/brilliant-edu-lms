import { GraduationCap } from "lucide-react";
import { useLoader } from "../../hooks/useLoader";
import { dueLabel } from "../../lib/format";
import { getGradebook } from "../../services/grades";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/Progress";
import { EmptyState, ErrorState, Loading } from "../ui/States";

const STATUS_LABEL: Record<string, { tone: "success" | "warning" | "danger" | "neutral" | "info"; label: string }> = {
  graded: { tone: "success", label: "Graded" },
  needs_grading: { tone: "warning", label: "Awaiting grading" },
  submitted: { tone: "info", label: "Submitted" },
  in_progress: { tone: "info", label: "In progress" },
  missing: { tone: "danger", label: "Missing" },
  none: { tone: "neutral", label: "Not started" },
};

/** A learner's own grades for one course (server returns only their row). */
export function MyGrades({ courseId }: { courseId: string }) {
  const data = useLoader(() => getGradebook(courseId), [courseId]);
  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading />;
  const gb = data.data;
  const row = gb.rows[0];
  if (!gb.columns.length || !row) return <EmptyState icon={<GraduationCap className="size-5" />} title="No graded work yet" message="Quiz and assignment results for this course will appear here." />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-5 rounded-lg border border-rule bg-paper-2 p-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Overall (graded items)</p>
          <p className="font-display text-3xl font-semibold tabular-nums">{row.percent === null ? "—" : `${row.percent}%`}</p>
          {row.possible > 0 && <p className="text-sm text-ink-2">{row.earned} of {row.possible} points</p>}
        </div>
        {row.percent !== null && <ProgressBar value={row.percent} className="min-w-48 flex-1" showLabel />}
      </div>
      <ul className="overflow-hidden rounded-lg border border-rule bg-paper">
        {gb.columns.map((c) => {
          const cell = row.cells[c.activity_id];
          const st = STATUS_LABEL[cell?.status || "none"];
          return (
            <li key={c.activity_id} className="flex flex-wrap items-center gap-3 border-b border-rule px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-ink-3">{c.type === "quiz" ? "Quiz" : `Assignment · ${dueLabel(c.due_at)}`}{cell?.late ? " · submitted late" : ""}</p>
              </div>
              <Badge tone={st.tone}>{st.label}</Badge>
              <span className="w-24 text-right font-mono text-sm">
                {cell?.status === "graded" ? (c.type === "quiz" ? `${cell.percent}%` : `${cell.score} / ${c.max}`) : c.type === "quiz" && cell?.status === "submitted" && !c.results_visible ? "Hidden" : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
