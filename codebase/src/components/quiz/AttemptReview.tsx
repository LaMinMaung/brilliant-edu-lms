import { useState } from "react";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import type { AttemptPayload, AttemptQuestion } from "../../lib/types-phase2";
import { errorMessage } from "../../lib/errors";
import { cx } from "../../lib/format";
import { describeAnswer, QUESTION_TYPE_LABEL } from "../../lib/quiz";
import { gradeResponse } from "../../services/quizzes";
import { useToast } from "../../hooks/useToast";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Field";

function Status({ q }: { q: AttemptQuestion }) {
  if (q.needs_review) return <Badge tone="warning"><CircleAlert className="size-3" aria-hidden /> Awaiting review</Badge>;
  if (q.is_correct === undefined) return null;
  return q.is_correct
    ? <Badge tone="success"><CheckCircle2 className="size-3" aria-hidden /> Correct</Badge>
    : (q.points_awarded ?? 0) > 0 ? <Badge tone="info">Partial credit</Badge> : <Badge tone="danger"><XCircle className="size-3" aria-hidden /> Incorrect</Badge>;
}

function GradeForm({ q, onGraded }: { q: AttemptQuestion; onGraded: (p: AttemptPayload) => void }) {
  const toast = useToast();
  const [points, setPoints] = useState(String(q.points_awarded ?? 0));
  const [feedback, setFeedback] = useState(q.grader_feedback || "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const n = Number(points);
    if (!isFinite(n) || n < 0 || n > q.points) return toast(`Points must be between 0 and ${q.points}.`, "error");
    setBusy(true);
    try {
      onGraded(await gradeResponse(q.response_id!, n, feedback));
      toast("Grade saved");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-md border border-marker-deep/25 bg-marker-soft/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium" htmlFor={`pts-${q.id}`}>Points (max {q.points})</label>
        <Input id={`pts-${q.id}`} type="number" min={0} max={q.points} step={0.5} value={points} onChange={(e) => setPoints(e.target.value)} className="h-8 w-24" />
        <Button size="sm" onClick={save} loading={busy}>{q.needs_review ? "Grade" : "Update grade"}</Button>
      </div>
      <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} placeholder="Feedback for the student (optional)" aria-label="Feedback" className="min-h-0" />
    </div>
  );
}

interface Props {
  payload: AttemptPayload;
  canGrade?: boolean;
  onGraded?: (p: AttemptPayload) => void;
}

export function AttemptReview({ payload, canGrade, onGraded }: Props) {
  const { attempt, questions, results_visible, key_visible } = payload;
  return (
    <div className="flex flex-col gap-4">
      {results_visible && attempt.percent !== undefined && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-paper-2 p-4">
          <span className="font-display text-3xl font-semibold tabular-nums">{attempt.percent}%</span>
          <span className="text-sm text-ink-2">{attempt.score} / {attempt.max_score} points</span>
          {attempt.status === "needs_grading" ? <Badge tone="warning">Partly awaiting grading</Badge> : attempt.passed ? <Badge tone="success">Passed</Badge> : <Badge tone="danger">Not passed</Badge>}
          {attempt.auto_submitted && <Badge>Submitted automatically when time ran out</Badge>}
        </div>
      )}
      <ol className="flex flex-col gap-3">
        {questions.map((q, i) => (
          <li key={q.id} className={cx("rounded-lg border bg-paper p-4", q.needs_review ? "border-marker-deep/40" : "border-rule")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Question {i + 1} · {QUESTION_TYPE_LABEL[q.type]} · {q.points} pt{q.points === 1 ? "" : "s"}</p>
              <div className="flex items-center gap-2">
                {results_visible && q.points_awarded !== undefined && <span className="font-mono text-xs">{q.points_awarded}/{q.points}</span>}
                <Status q={q} />
              </div>
            </div>
            <p className="mt-2 whitespace-pre-line">{q.prompt}</p>
            <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-[140px_1fr]">
              <dt className="text-ink-3">{canGrade ? "Student answer" : "Your answer"}</dt>
              <dd className="whitespace-pre-line font-medium">{describeAnswer(q, q.answer)}</dd>
              {key_visible && q.correct !== undefined && q.correct !== null && (
                <>
                  <dt className="text-ink-3">{q.type === "short_answer" ? "Accepted answers" : "Correct answer"}</dt>
                  <dd className="text-moss">{describeAnswer(q, q.correct) === "No answer" ? "Reviewed manually" : describeAnswer(q, q.correct)}</dd>
                </>
              )}
            </dl>
            {key_visible && q.explanation && <p className="mt-2 rounded-md bg-paper-2 px-3 py-2 text-sm text-ink-2">{q.explanation}</p>}
            {q.grader_feedback && !canGrade && <p className="mt-2 rounded-md border-l-2 border-marker bg-marker-soft/50 px-3 py-2 text-sm"><span className="font-medium">Instructor feedback: </span>{q.grader_feedback}</p>}
            {canGrade && q.response_id && onGraded && (q.type === "short_answer" || q.needs_review) && <GradeForm q={q} onGraded={onGraded} />}
          </li>
        ))}
      </ol>
    </div>
  );
}
