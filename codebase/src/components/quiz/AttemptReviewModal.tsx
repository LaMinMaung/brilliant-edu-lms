import { useLoader } from "../../hooks/useLoader";
import { getAttempt } from "../../services/quizzes";
import { Modal } from "../ui/Modal";
import { ErrorState, Loading } from "../ui/States";
import { AttemptReview } from "./AttemptReview";

/** Staff view of one attempt, with the answer key and manual grading for short answers. */
export function AttemptReviewModal({ attemptId, onClose, onChanged }: { attemptId: string | null; onClose: () => void; onChanged?: () => void }) {
  const data = useLoader(() => (attemptId ? getAttempt(attemptId) : Promise.resolve(null)), [attemptId]);
  const p = data.data;
  return (
    <Modal open={!!attemptId} onClose={onClose} size="lg"
      title={p ? `${p.student?.name || "Student"} · attempt ${p.attempt.attempt_number}` : "Attempt"}
      description={p?.attempt.status === "in_progress" ? "This attempt is still in progress." : undefined}>
      {data.error ? <ErrorState message={data.error} onRetry={data.reload} /> : !p ? <Loading /> : (
        <AttemptReview payload={p} canGrade onGraded={(next) => { data.setData({ ...next, student: p.student }); onChanged?.(); }} />
      )}
    </Modal>
  );
}
