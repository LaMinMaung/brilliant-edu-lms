import { useEffect, useState } from "react";
import type { Assignment, Submission } from "../../lib/types-phase2";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { displayName } from "../../lib/format";
import { getAssignmentByActivity, getSubmission, gradeSubmission, listUserSubmissions } from "../../services/assignments";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Field";
import { ErrorState, Loading } from "../ui/States";
import { FormError } from "../auth/AuthLayout";
import { SubmissionContent } from "./SubmissionContent";

/** Review a submission (with earlier submissions as history), then grade it with feedback. */
export function GradeSubmissionModal({ submissionId, onClose, onGraded }: { submissionId: string | null; onClose: () => void; onGraded?: (s: Submission) => void }) {
  const toast = useToast();
  const data = useLoader(async () => {
    if (!submissionId) return null;
    const sub = await getSubmission(submissionId);
    const [asg, history] = await Promise.all([getAssignmentByActivity(sub.activity), listUserSubmissions(sub.assignment, sub.user)]);
    return { sub, asg: asg as Assignment, history: history.filter((h) => h.id !== sub.id) };
  }, [submissionId]);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data.data) return;
    setGrade(data.data.sub.status === "graded" ? String(data.data.sub.grade) : "");
    setFeedback(data.data.sub.feedback || "");
    setError(null);
  }, [data.data]);

  const save = async () => {
    if (!data.data) return;
    const n = Number(grade);
    const max = data.data.asg.max_marks;
    if (grade === "" || !isFinite(n) || n < 0 || (max > 0 && n > max)) return setError(`Enter a grade between 0 and ${max}.`);
    setBusy(true);
    try {
      const saved = await gradeSubmission(data.data.sub.id, n, feedback);
      toast("Grade saved and student notified");
      onGraded?.(saved);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const d = data.data;
  return (
    <Modal open={!!submissionId} onClose={onClose} size="lg" title={d ? `Grade: ${displayName(d.sub.expand?.user)}` : "Grade submission"}
      footer={d && <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Save grade</Button></>}>
      {data.error ? <ErrorState message={data.error} onRetry={data.reload} /> : !d ? <Loading /> : (
        <div className="flex flex-col gap-5">
          <SubmissionContent sub={d.sub} showGrade={false} />
          <div className="flex flex-col gap-4 border-t border-rule pt-4">
            <FormError message={error} />
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <Field label={`Grade (out of ${d.asg.max_marks})`}>{(id) => <Input id={id} type="number" min={0} max={d.asg.max_marks} step={0.5} value={grade} onChange={(e) => setGrade(e.target.value)} />}</Field>
              <Field label="Feedback">{(id) => <Textarea id={id} value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} maxLength={5000} />}</Field>
            </div>
          </div>
          {d.history.length > 0 && (
            <details className="rounded-md border border-rule p-3">
              <summary className="cursor-pointer text-sm font-medium">Earlier submissions ({d.history.length})</summary>
              <div className="mt-3 flex flex-col gap-4">{d.history.map((h) => <SubmissionContent key={h.id} sub={h} />)}</div>
            </details>
          )}
        </div>
      )}
    </Modal>
  );
}
