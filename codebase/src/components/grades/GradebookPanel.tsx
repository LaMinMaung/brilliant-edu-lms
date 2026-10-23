import { Download, GraduationCap } from "lucide-react";
import type { Gradebook, GradeColumn, GradeRow } from "../../lib/types-phase2";
import { useLoader } from "../../hooks/useLoader";
import { cx } from "../../lib/format";
import { cellLabel, getGradebook, gradebookToCsv } from "../../services/grades";
import { Button } from "../ui/Button";
import { EmptyState, ErrorState, Loading } from "../ui/States";

function Cell({ row, col }: { row: GradeRow; col: GradeColumn }) {
  const c = row.cells[col.activity_id];
  const tone = !c ? "" : c.status === "graded" ? (c.passed ? "text-moss" : "text-ink") : c.status === "missing" ? "text-brick" : c.needs_grading ? "text-marker-deep" : "text-ink-3";
  return (
    <td className={cx("whitespace-nowrap border-b border-l border-rule px-3 py-2.5 text-center font-mono text-xs", tone)}>
      {cellLabel(row, col)}
      {c?.late && <span className="ml-1 text-brick" title="Submitted late">· late</span>}
    </td>
  );
}

function download(gb: Gradebook) {
  const blob = new Blob([gradebookToCsv(gb)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${gb.course.title.replace(/[^\w-]+/g, "_")}_grades.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Staff gradebook: every active learner × every quiz/assignment, from the server-computed grades. */
export function GradebookPanel({ courseId }: { courseId: string }) {
  const data = useLoader(() => getGradebook(courseId), [courseId]);
  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading label="Building gradebook" />;
  const gb = data.data;
  if (!gb.columns.length) return <EmptyState icon={<GraduationCap className="size-5" />} title="Nothing to grade yet" message="Add a quiz or assignment to the curriculum and grades will appear here." />;
  if (!gb.rows.length) return <EmptyState icon={<GraduationCap className="size-5" />} title="No active learners" message="Grades appear once learners are enrolled." />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-2">Quizzes show the best graded attempt. Assignments show the latest submission. Totals include graded items only.</p>
        <Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={() => download(gb)}>Export CSV</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-rule bg-paper">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-rule bg-paper-2 px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">Learner</th>
              {gb.columns.map((c) => (
                <th key={c.activity_id} className="min-w-28 border-b border-l border-rule bg-paper-2 px-3 py-2.5 text-center align-bottom">
                  <span className="block font-mono text-[10px] uppercase text-ink-3">{c.type}{!c.published && " · draft"}</span>
                  <span className="line-clamp-2 text-xs font-medium">{c.title}</span>
                </th>
              ))}
              <th className="border-b border-l border-rule bg-paper-2 px-3 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {gb.rows.map((r) => (
              <tr key={r.user.id} className="hover:bg-paper-2">
                <td className="sticky left-0 z-10 border-b border-rule bg-paper px-4 py-2.5">
                  <span className="block font-medium">{r.user.name}</span>
                  <span className="block text-xs text-ink-3">{r.user.email}</span>
                </td>
                {gb.columns.map((c) => <Cell key={c.activity_id} row={r} col={c} />)}
                <td className="border-b border-l border-rule px-3 py-2.5 text-center font-mono text-xs font-medium">
                  {r.percent === null ? "—" : `${r.percent}%`}
                  {r.possible > 0 && <span className="block text-[10px] font-normal text-ink-3">{r.earned}/{r.possible}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
