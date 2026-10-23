import pb from "../lib/pocketbase";
import type { GradeColumn, GradeRow, Gradebook, GradingQueueItem } from "../lib/types-phase2";

export const getGradebook = (courseId: string) => pb.send<Gradebook>(`/api/lms/grades/${courseId}`, { requestKey: null });

export const getGradingQueue = () => pb.send<{ items: GradingQueueItem[] }>("/api/lms/grading/queue", { requestKey: null });

/** Display value for a gradebook cell. */
export function cellLabel(row: GradeRow, col: GradeColumn) {
  const c = row.cells[col.activity_id];
  if (!c) return "—";
  switch (c.status) {
    case "graded":
      return col.type === "quiz" ? `${c.percent ?? 0}%` : `${c.score}${c.max ? ` / ${c.max}` : ""}`;
    case "needs_grading":
    case "submitted":
      return "To grade";
    case "in_progress":
      return "In progress";
    case "missing":
      return "Missing";
    default:
      return "—";
  }
}

function csvEscape(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** CSV export of a gradebook (one row per learner, one column per graded activity). */
export function gradebookToCsv(gb: Gradebook) {
  const header = ["Learner", "Email", ...gb.columns.map((c) => `${c.title} (${c.type})`), "Total earned", "Total possible", "Total %"];
  const lines = [header.map(csvEscape).join(",")];
  for (const row of gb.rows) {
    const cells = gb.columns.map((col) => {
      const c = row.cells[col.activity_id];
      if (!c || c.status !== "graded") return c?.status === "missing" ? "missing" : "";
      return col.type === "quiz" ? String(c.percent ?? "") : String(c.score ?? "");
    });
    lines.push([row.user.name, row.user.email, ...cells, String(row.earned), String(row.possible), row.percent === null ? "" : String(row.percent)].map(csvEscape).join(","));
  }
  return lines.join("\n");
}
