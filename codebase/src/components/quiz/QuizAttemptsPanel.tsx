import { useState } from "react";
import { Users } from "lucide-react";
import type { Quiz } from "../../lib/types-phase2";
import { useLoader } from "../../hooks/useLoader";
import { displayName, formatDateTime } from "../../lib/format";
import { listQuizAttempts } from "../../services/quizzes";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Table, Td, Th } from "../ui/Table";
import { EmptyState, ErrorState, Loading } from "../ui/States";
import { AttemptReviewModal } from "./AttemptReviewModal";

const STATUS: Record<string, { tone: "warning" | "success" | "info"; label: string }> = {
  in_progress: { tone: "info", label: "In progress" },
  needs_grading: { tone: "warning", label: "Needs grading" },
  graded: { tone: "success", label: "Graded" },
};

export function QuizAttemptsPanel({ quiz }: { quiz: Quiz }) {
  const list = useLoader(() => listQuizAttempts(quiz.id), [quiz.id]);
  const [open, setOpen] = useState<string | null>(null);

  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />;
  if (!list.data) return <Loading />;
  if (!list.data.length) return <EmptyState icon={<Users className="size-5" />} title="No attempts yet" message="Attempts appear here as soon as enrolled students start the quiz." />;
  const pending = list.data.filter((a) => a.status === "needs_grading").length;

  return (
    <>
      {pending > 0 && <p className="mb-3 rounded-md bg-marker-soft px-3 py-2 text-sm">{pending} attempt{pending === 1 ? "" : "s"} need{pending === 1 ? "s" : ""} manual grading.</p>}
      <Table>
        <thead><tr><Th>Student</Th><Th>Attempt</Th><Th>Status</Th><Th>Score</Th><Th>Submitted</Th></tr></thead>
        <tbody>
          {list.data.map((a) => (
            <tr key={a.id} className="cursor-pointer hover:bg-paper-2" onClick={() => setOpen(a.id)}>
              <Td>
                <button className="flex items-center gap-3 text-left" onClick={(e) => { e.stopPropagation(); setOpen(a.id); }}>
                  <Avatar user={a.expand?.user} size="xs" />
                  <span className="font-medium hover:underline">{displayName(a.expand?.user)}</span>
                </button>
              </Td>
              <Td className="font-mono text-xs">#{a.attempt_number}{a.auto_submitted ? " · auto" : ""}</Td>
              <Td><Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge></Td>
              <Td className="font-mono text-xs">{a.status === "in_progress" ? "—" : `${a.percent}% (${a.score}/${a.max_score})`}{a.status === "graded" && a.passed ? " · passed" : ""}</Td>
              <Td className="font-mono text-xs text-ink-2">{a.submitted_at ? formatDateTime(a.submitted_at) : "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <AttemptReviewModal attemptId={open} onClose={() => setOpen(null)} onChanged={list.reload} />
    </>
  );
}
