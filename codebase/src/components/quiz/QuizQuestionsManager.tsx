import { useState } from "react";
import { ArrowDown, ArrowUp, Library, Plus, X } from "lucide-react";
import type { Quiz } from "../../lib/types-phase2";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { QUESTION_TYPE_LABEL } from "../../lib/quiz";
import { addQuizQuestion, listQuestionCategories, listQuizQuestions, removeQuizQuestion, reorderQuizQuestions, setQuizQuestionPoints } from "../../services/quizzes";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Panel } from "../ui/Panel";
import { EmptyState, ErrorState, Loading } from "../ui/States";
import { QuestionModal } from "./QuestionModal";
import { QuestionPickerModal } from "./QuestionPickerModal";

/** Which bank questions are in this quiz, their order and per-quiz points. */
export function QuizQuestionsManager({ quiz }: { quiz: Quiz }) {
  const toast = useToast();
  const links = useLoader(() => listQuizQuestions(quiz.id), [quiz.id]);
  const cats = useLoader(() => listQuestionCategories(quiz.course), [quiz.course]);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); if (ok) toast(ok); await links.reload(); } catch (err) { toast(errorMessage(err), "error"); }
  };

  if (links.error) return <ErrorState message={links.error} onRetry={links.reload} />;
  if (!links.data) return <Loading />;
  const rows = links.data;
  const total = rows.reduce((n, r) => n + (r.points || r.expand?.question?.points || 1), 0);

  const move = (i: number, dir: -1 | 1) => {
    const ids = rows.map((r) => r.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => reorderQuizQuestions(ids));
  };

  return (
    <Panel title="Questions" description={`${rows.length} question${rows.length === 1 ? "" : "s"} · ${total} point${total === 1 ? "" : "s"} total`}
      actions={
        <>
          <Button size="sm" variant="secondary" icon={<Library className="size-4" />} onClick={() => setPicking(true)}>Add from bank</Button>
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>New question</Button>
        </>
      }>
      {!rows.length ? (
        <EmptyState title="No questions yet" message="Add existing questions from the course bank, or write a new one. New questions are saved to the bank automatically." />
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const q = r.expand?.question;
            return (
              <li key={r.id} className="flex flex-wrap items-start gap-3 rounded-md border border-rule px-3 py-2.5">
                <span className="mt-0.5 font-mono text-xs text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">{q?.prompt || "(question removed)"}</p>
                  {q && <div className="mt-1"><Badge tone="info">{QUESTION_TYPE_LABEL[q.type]}</Badge></div>}
                </div>
                <label className="flex items-center gap-1.5 text-xs text-ink-3">
                  Points
                  <input type="number" min={0} step={0.5} defaultValue={r.points || q?.points || 1} aria-label={`Points for question ${i + 1}`}
                    onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== (r.points || q?.points || 1)) run(() => setQuizQuestionPoints(r.id, v), "Points updated"); }}
                    className="h-8 w-16 rounded-md border border-rule-strong px-2 text-sm text-ink" />
                </label>
                <div className="flex">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 disabled:opacity-30" aria-label="Move up"><ArrowUp className="size-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 disabled:opacity-30" aria-label="Move down"><ArrowDown className="size-4" /></button>
                  <button onClick={() => run(() => removeQuizQuestion(r.id), "Removed from quiz")} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-brick" aria-label="Remove from quiz"><X className="size-4" /></button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 text-xs text-ink-3">Changes apply to new attempts. Attempts already started keep the questions they were given.</p>

      <QuestionPickerModal open={picking} onClose={() => setPicking(false)} courseId={quiz.course} categories={cats.data || []} excludeIds={rows.map((r) => r.question)}
        onPick={async (qs) => {
          await run(async () => { for (let i = 0; i < qs.length; i++) await addQuizQuestion(quiz, qs[i].id, rows.length + i); }, `Added ${qs.length} question${qs.length === 1 ? "" : "s"}`);
        }} />
      <QuestionModal open={creating} onClose={() => setCreating(false)} courseId={quiz.course} categories={cats.data || []}
        onSaved={(q) => run(() => addQuizQuestion(quiz, q.id, rows.length), "Question created and added")} />
    </Panel>
  );
}
