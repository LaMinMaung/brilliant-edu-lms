import { useEffect, useRef, useState } from "react";
import { Clock, ListChecks, RotateCcw, Target, Timer } from "lucide-react";
import type { Activity, ActivityProgress } from "../../lib/types";
import type { AttemptPayload } from "../../lib/types-phase2";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { formatDateTime } from "../../lib/format";
import { getActivity } from "../../services/curriculum";
import { getAttempt, getQuizSummary, startAttempt } from "../../services/quizzes";
import { recordAccess } from "../../services/progress";
import { RichText } from "../editor/RichText";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ErrorState, Loading } from "../ui/States";
import { Table, Td, Th } from "../ui/Table";
import { AttemptReview } from "../quiz/AttemptReview";
import { QuizTaker } from "./QuizTaker";

interface Props {
  courseId: string;
  userId: string;
  activity: Activity;
  mode: "learner" | "preview";
  progress?: ActivityProgress;
  onProgress: (p: ActivityProgress) => void;
  onCompletionMaybeChanged: () => void;
}

const SHOW_LABEL = { immediately: "after you submit", after_close: "after the quiz closes", never: "by your instructor only" };

export function QuizView({ courseId, userId, activity, mode, progress, onProgress, onCompletionMaybeChanged }: Props) {
  const toast = useToast();
  const data = useLoader(async () => {
    const [full, summary] = await Promise.all([getActivity(activity.id), getQuizSummary(activity.id)]);
    return { full, summary };
  }, [activity.id]);
  const [taking, setTaking] = useState<AttemptPayload | null>(null);
  const [result, setResult] = useState<AttemptPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const accessed = useRef(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    if (mode !== "learner" || accessed.current) return;
    accessed.current = true;
    recordAccess(progressRef.current, { userId, courseId, activityId: activity.id, autoComplete: false })
      .then(onProgress)
      .catch((err) => console.error("Failed to record access", err));
  }, [mode, userId, courseId, activity.id, onProgress]);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading label="Loading quiz" />;
  const { full, summary } = data.data;
  const s = summary.quiz;

  const start = async () => {
    setBusy(true);
    try {
      setResult(null);
      setTaking(await startAttempt(activity.id));
    } catch (err) {
      toast(errorMessage(err), "error");
      data.reload();
    } finally {
      setBusy(false);
    }
  };

  const openAttempt = async (id: string) => {
    try { setResult(await getAttempt(id)); } catch (err) { toast(errorMessage(err), "error"); }
  };

  if (taking) {
    return (
      <QuizTaker payload={taking} onFinished={(p) => {
        setTaking(null);
        setResult(p);
        data.reload();
        onCompletionMaybeChanged();
      }} />
    );
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Attempt {result.attempt.attempt_number} {result.attempt.status === "in_progress" ? "(in progress)" : "results"}</h2>
          <Button size="sm" variant="secondary" onClick={() => setResult(null)}>Back to quiz overview</Button>
        </div>
        {result.attempt.status === "in_progress" ? (
          <Button onClick={start}>Resume attempt</Button>
        ) : !result.results_visible ? (
          <p className="rounded-lg border border-rule bg-paper-2 p-4 text-sm">Your attempt was submitted on {formatDateTime(result.attempt.submitted_at)}. Results will be available {SHOW_LABEL[s.show_results]}.</p>
        ) : (
          <AttemptReview payload={result} />
        )}
      </div>
    );
  }

  const facts = [
    { icon: ListChecks, label: `${summary.question_count} question${summary.question_count === 1 ? "" : "s"} · ${summary.total_points} points` },
    { icon: Target, label: `Pass mark ${s.passing_score}%` },
    { icon: Timer, label: s.time_limit_minutes ? `${s.time_limit_minutes} minute time limit` : "No time limit" },
    { icon: RotateCcw, label: s.max_attempts ? `${s.max_attempts} attempt${s.max_attempts === 1 ? "" : "s"} allowed${summary.attempts_left !== null && mode === "learner" ? ` · ${summary.attempts_left} left` : ""}` : "Unlimited attempts" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {full.content && <RichText html={full.content} />}
      <ul className="grid gap-2 sm:grid-cols-2">
        {facts.map((f) => (
          <li key={f.label} className="flex items-center gap-2.5 rounded-md border border-rule bg-paper px-3 py-2.5 text-sm"><f.icon className="size-4 text-ink-3" aria-hidden /> {f.label}</li>
        ))}
      </ul>
      {(s.available_from || s.available_until) && (
        <p className="flex items-center gap-2 text-sm text-ink-2"><Clock className="size-4" aria-hidden />
          {s.available_from && `Opens ${formatDateTime(s.available_from)}`}{s.available_from && s.available_until && " · "}{s.available_until && `Closes ${formatDateTime(s.available_until)}`}
        </p>
      )}
      <p className="text-sm text-ink-3">Results are shown {SHOW_LABEL[s.show_results]}{s.show_correct_answers ? ", with correct answers" : ""}.</p>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-paper-2 p-4">
        {summary.best_percent !== null && <span className="text-sm">Best score: <strong>{summary.best_percent}%</strong> {summary.best_percent >= s.passing_score ? <Badge tone="success">Passed</Badge> : null}</span>}
        <span className="ml-auto" />
        {mode === "preview" ? (
          <p className="text-sm text-ink-2">{summary.reason}</p>
        ) : summary.can_start ? (
          <Button variant="marker" onClick={start} loading={busy}>{summary.in_progress_id ? "Resume attempt" : summary.attempts.length ? "Start new attempt" : "Start quiz"}</Button>
        ) : (
          <p className="text-sm text-ink-2">{summary.reason}</p>
        )}
      </div>

      {summary.attempts.length > 0 && (
        <section aria-labelledby="attempts-h">
          <h2 id="attempts-h" className="mb-2 font-display text-lg font-semibold">Your attempts</h2>
          <Table>
            <thead><tr><Th>Attempt</Th><Th>Status</Th><Th>Score</Th><Th>Submitted</Th><Th /></tr></thead>
            <tbody>
              {summary.attempts.slice().reverse().map((a) => (
                <tr key={a.id}>
                  <Td className="font-mono text-xs">#{a.attempt_number}{a.auto_submitted ? " · auto-submitted" : ""}</Td>
                  <Td>{a.status === "in_progress" ? <Badge tone="info">In progress</Badge> : a.status === "needs_grading" ? <Badge tone="warning">Awaiting grading</Badge> : <Badge tone="success">Graded</Badge>}</Td>
                  <Td className="font-mono text-xs">{a.percent !== undefined ? `${a.percent}%${a.passed ? " · passed" : ""}` : a.status === "in_progress" ? "—" : "Hidden"}</Td>
                  <Td className="font-mono text-xs text-ink-2">{a.submitted_at ? formatDateTime(a.submitted_at) : "—"}</Td>
                  <Td className="text-right">
                    {a.status === "in_progress"
                      ? <Button size="sm" variant="secondary" onClick={start}>Resume</Button>
                      : <Button size="sm" variant="ghost" onClick={() => openAttempt(a.id)}>Review</Button>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}
    </div>
  );
}
