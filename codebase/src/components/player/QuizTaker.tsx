import { useCallback, useEffect, useRef, useState } from "react";
import { ClientResponseError } from "pocketbase";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import type { AnswerValue, AttemptPayload, AttemptQuestion } from "../../lib/types-phase2";
import { errorMessage } from "../../lib/errors";
import { cx } from "../../lib/format";
import { countAnswered, formatClock, isAnswered, remainingMs, toggleChoice } from "../../lib/quiz";
import { getAttempt, saveAnswers, submitAttempt } from "../../services/quizzes";
import { useToast } from "../../hooks/useToast";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";

type SaveState = "idle" | "saving" | "saved" | "error";

function QuestionInputFor({ q, value, onChange, index }: { q: AttemptQuestion; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; index: number }) {
  const name = `q-${q.id}`;
  if (q.type === "multiple_choice") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Question {index + 1} choices</legend>
        {q.multiple && <p className="text-xs text-ink-3">Select all that apply.</p>}
        {q.choices.map((c) => {
          const on = selected.includes(c.id);
          return (
            <label key={c.id} className={cx("flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors", on ? "border-ink bg-marker-soft" : "border-rule-strong hover:bg-paper-2")}>
              <input type={q.multiple ? "checkbox" : "radio"} name={name} checked={on} onChange={() => onChange(toggleChoice(value ?? null, c.id, q.multiple))}
                className="mt-0.5 size-4 accent-[var(--color-ink)]" />
              <span className="text-[15px]">{c.text}</span>
            </label>
          );
        })}
      </fieldset>
    );
  }
  if (q.type === "true_false") {
    return (
      <div className="flex gap-2" role="radiogroup" aria-label={`Question ${index + 1}`}>
        {(["true", "false"] as const).map((v) => (
          <label key={v} className={cx("flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-medium", value === v ? "border-ink bg-marker-soft" : "border-rule-strong hover:bg-paper-2")}>
            <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
            {v === "true" ? "True" : "False"}
          </label>
        ))}
      </div>
    );
  }
  if (q.type === "short_answer") {
    return (
      <input type="text" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} maxLength={5000} aria-label={`Answer to question ${index + 1}`}
        placeholder="Type your answer" className="h-11 w-full rounded-md border border-rule-strong bg-paper px-3 text-[15px] focus:border-ink focus:outline-none" />
    );
  }
  return <p className="text-sm text-ink-3">This question is no longer available and won't be graded against you.</p>;
}

/** Attempt-taking screen: server-fixed question order, autosave, server-synced timer, safe submission. */
export function QuizTaker({ payload, onFinished }: { payload: AttemptPayload; onFinished: (p: AttemptPayload) => void }) {
  const toast = useToast();
  const attemptId = payload.attempt.id;
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() =>
    Object.fromEntries(payload.questions.map((q) => [q.id, q.answer ?? null])),
  );
  const [save, setSave] = useState<SaveState>("idle");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const offset = useRef(new Date(payload.server_time).getTime() - Date.now());
  const [left, setLeft] = useState<number | null>(() => remainingMs(payload.attempt.deadline, offset.current));
  const dirty = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const finished = useRef(false);

  const finishFromServer = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    onFinished(await getAttempt(attemptId));
  }, [attemptId, onFinished]);

  const submit = useCallback(async (auto = false) => {
    if (finished.current) return;
    setSubmitting(true);
    try {
      const result = await submitAttempt(attemptId, answersRef.current);
      finished.current = true;
      dirty.current = false;
      if (auto) toast("Time is up. Your answers were submitted.");
      onFinished(result);
    } catch (err) {
      if (err instanceof ClientResponseError && (err.status === 409 || err.status === 404)) await finishFromServer();
      else toast(errorMessage(err, "Submission failed. Your answers are saved; please try again."), "error");
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, finishFromServer, onFinished, toast]);

  // Timer (re-synced with server time on each autosave).
  useEffect(() => {
    if (left === null) return;
    const t = setInterval(() => {
      const ms = remainingMs(payload.attempt.deadline, offset.current);
      setLeft(ms);
      if (ms !== null && ms <= 0) { clearInterval(t); submit(true); }
    }, 1000);
    return () => clearInterval(t);
  }, [payload.attempt.deadline, left === null, submit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced autosave.
  useEffect(() => {
    if (!dirty.current) return;
    setSave("saving");
    const t = setTimeout(async () => {
      try {
        const res = await saveAnswers(attemptId, answersRef.current);
        offset.current = new Date(res.server_time).getTime() - Date.now();
        dirty.current = false;
        setSave("saved");
      } catch (err) {
        if (err instanceof ClientResponseError && err.isAbort) return;
        if (err instanceof ClientResponseError && err.status === 409) { await finishFromServer(); return; }
        setSave("error");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [answers, attemptId, finishFromServer]);

  // Warn before leaving with unsaved answers.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current && !finished.current) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const setAnswer = (id: string, v: AnswerValue) => { dirty.current = true; setAnswers((a) => ({ ...a, [id]: v })); };
  const answered = countAnswered(payload.questions, answers);
  const total = payload.questions.length;
  const low = left !== null && left < 60000;

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-14 z-10 -mx-2 flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-paper/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <span className="font-mono text-xs">Attempt {payload.attempt.attempt_number}</span>
        <span className="text-sm text-ink-2">{answered} of {total} answered</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-3" aria-live="polite">
          {save === "saving" && <><Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving…</>}
          {save === "saved" && <><CheckCircle2 className="size-3.5 text-moss" aria-hidden /> Saved</>}
          {save === "error" && <><AlertTriangle className="size-3.5 text-brick" aria-hidden /> Not saved, retrying on next change</>}
        </span>
        {left !== null && (
          <span className={cx("flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-sm tabular-nums", low ? "bg-brick-soft text-brick" : "bg-paper-3")} role="timer" aria-label="Time remaining">
            <Clock className="size-3.5" aria-hidden /> {formatClock(left)}
          </span>
        )}
      </div>

      <nav aria-label="Jump to question" className="flex flex-wrap gap-1.5">
        {payload.questions.map((q, i) => (
          <a key={q.id} href={`#question-${q.id}`} className={cx("flex size-8 items-center justify-center rounded-md border font-mono text-xs", isAnswered(q, answers[q.id]) ? "border-ink bg-ink text-paper" : "border-rule-strong hover:bg-paper-2")}
            aria-label={`Question ${i + 1}${isAnswered(q, answers[q.id]) ? " (answered)" : ""}`}>{i + 1}</a>
        ))}
      </nav>

      <ol className="flex flex-col gap-4">
        {payload.questions.map((q, i) => (
          <li key={q.id} id={`question-${q.id}`} className="scroll-mt-32 rounded-lg border border-rule bg-paper p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Question {i + 1} · {q.points} pt{q.points === 1 ? "" : "s"}</p>
            <p className="mb-4 mt-2 whitespace-pre-line text-[16px] leading-relaxed">{q.prompt}</p>
            <QuestionInputFor q={q} index={i} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-paper-2 p-4">
        <p className="text-sm text-ink-2">Answers save automatically. You can leave and resume{left !== null ? " while time remains" : ""}.</p>
        <Button variant="marker" onClick={() => setConfirm(true)} loading={submitting}>Submit attempt</Button>
      </div>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} danger={false} confirmLabel="Submit now" title="Submit this attempt?"
        message={answered < total ? `You have ${total - answered} unanswered question${total - answered === 1 ? "" : "s"}. Once submitted, answers can't be changed.` : "Once submitted, answers can't be changed."}
        onConfirm={() => submit(false)} />
    </div>
  );
}
