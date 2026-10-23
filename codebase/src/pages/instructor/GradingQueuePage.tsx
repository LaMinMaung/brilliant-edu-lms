import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, Inbox, ListChecks } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Table, Td, Th } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { GradeSubmissionModal } from "../../components/assignment/GradeSubmissionModal";
import { AttemptReviewModal } from "../../components/quiz/AttemptReviewModal";
import { useAuth } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { formatDateTime, timeAgo } from "../../lib/format";
import { getGradingQueue } from "../../services/grades";

/** Everything waiting for a grade across the courses this user teaches. */
export default function GradingQueuePage() {
  const { role } = useAuth();
  const queue = useLoader(getGradingQueue, []);
  const [sub, setSub] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<string | null>(null);
  const manageBase = role?.dashboard === "admin" ? "/admin/courses" : "/teach/courses";

  return (
    <>
      <PageHeader eyebrow="Teaching" title="Grading" description="Assignment submissions and quiz answers waiting for your review, oldest first." />
      {queue.error ? <ErrorState message={queue.error} onRetry={queue.reload} /> : !queue.data ? <Loading /> : !queue.data.items.length ? (
        <EmptyState icon={<Inbox className="size-5" />} title="All caught up" message="New submissions and short answers needing review will appear here." />
      ) : (
        <Table>
          <thead><tr><Th>Item</Th><Th>Student</Th><Th>Course</Th><Th>Submitted</Th><Th className="text-right">Action</Th></tr></thead>
          <tbody>
            {queue.data.items.map((it) => (
              <tr key={it.kind + it.id} className="hover:bg-paper-2">
                <Td>
                  <span className="flex items-center gap-2">
                    {it.kind === "submission" ? <ClipboardCheck className="size-4 text-ink-3" aria-label="Assignment" /> : <ListChecks className="size-4 text-ink-3" aria-label="Quiz" />}
                    <Link to={`${manageBase}/${it.course_id}/lessons/${it.activity_id}?tab=${it.kind === "submission" ? "submissions" : "attempts"}`} className="font-medium hover:underline">{it.activity}</Link>
                    {it.late && <Badge tone="danger">Late</Badge>}
                  </span>
                </Td>
                <Td>{it.student}</Td>
                <Td className="text-ink-2">{it.course}</Td>
                <Td className="font-mono text-xs text-ink-2" title={formatDateTime(it.submitted_at)}>{timeAgo(it.submitted_at)}</Td>
                <Td className="text-right">
                  <button onClick={() => (it.kind === "submission" ? setSub(it.id) : setAttempt(it.id))} className="rounded-md border border-rule-strong px-3 py-1 text-xs font-medium hover:bg-paper-3">
                    {it.kind === "submission" ? "Grade" : "Review answers"}
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <GradeSubmissionModal submissionId={sub} onClose={() => setSub(null)} onGraded={() => queue.reload()} />
      <AttemptReviewModal attemptId={attempt} onClose={() => { setAttempt(null); queue.reload(); }} />
    </>
  );
}
