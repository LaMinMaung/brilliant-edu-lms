import { useEffect, useState } from "react";
import type { Quiz, ShowResults } from "../../lib/types-phase2";
import { errorMessage } from "../../lib/errors";
import { fromInputDateTime, toInputDateTime } from "../../lib/format";
import { updateQuiz } from "../../services/quizzes";
import { useToast } from "../../hooks/useToast";
import { FormError } from "../auth/AuthLayout";
import { Button } from "../ui/Button";
import { Field, Input, Select, Toggle } from "../ui/Field";
import { Panel } from "../ui/Panel";

export function QuizSettingsForm({ quiz, onSaved }: { quiz: Quiz; onSaved: (q: Quiz) => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    time_limit_minutes: 0, max_attempts: 1, passing_score: 50, shuffle_questions: false, shuffle_choices: false,
    available_from: "", available_until: "", show_results: "immediately" as ShowResults, show_correct_answers: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setF({
      time_limit_minutes: quiz.time_limit_minutes || 0, max_attempts: quiz.max_attempts || 0, passing_score: quiz.passing_score || 0,
      shuffle_questions: quiz.shuffle_questions, shuffle_choices: quiz.shuffle_choices,
      available_from: toInputDateTime(quiz.available_from), available_until: toInputDateTime(quiz.available_until),
      show_results: (quiz.show_results || "immediately") as ShowResults, show_correct_answers: quiz.show_correct_answers,
    });
  }, [quiz]);

  const save = async () => {
    if (f.passing_score < 0 || f.passing_score > 100) return setError("Passing score must be between 0 and 100%.");
    if (f.available_from && f.available_until && new Date(f.available_from) >= new Date(f.available_until)) return setError("The quiz must close after it opens.");
    setBusy(true);
    setError(null);
    try {
      const saved = await updateQuiz(quiz.id, {
        ...f,
        time_limit_minutes: Math.max(0, Math.round(f.time_limit_minutes)),
        max_attempts: Math.max(0, Math.round(f.max_attempts)),
        available_from: fromInputDateTime(f.available_from),
        available_until: fromInputDateTime(f.available_until),
      });
      onSaved(saved);
      toast("Quiz settings saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const num = (k: "time_limit_minutes" | "max_attempts" | "passing_score") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });

  return (
    <Panel title="Quiz settings" actions={<Button size="sm" onClick={save} loading={busy}>Save settings</Button>}>
      <div className="flex flex-col gap-5">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Passing score (%)">{(id) => <Input id={id} type="number" min={0} max={100} value={f.passing_score} onChange={num("passing_score")} />}</Field>
          <Field label="Time limit (minutes)" hint="0 = no limit">{(id) => <Input id={id} type="number" min={0} max={1440} value={f.time_limit_minutes} onChange={num("time_limit_minutes")} />}</Field>
          <Field label="Attempts allowed" hint="0 = unlimited">{(id) => <Input id={id} type="number" min={0} max={100} value={f.max_attempts} onChange={num("max_attempts")} />}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Opens" hint="Leave empty to open immediately.">{(id) => <Input id={id} type="datetime-local" value={f.available_from} onChange={(e) => setF({ ...f, available_from: e.target.value })} />}</Field>
          <Field label="Closes" hint="Open attempts are submitted automatically at closing time.">{(id) => <Input id={id} type="datetime-local" value={f.available_until} onChange={(e) => setF({ ...f, available_until: e.target.value })} />}</Field>
        </div>
        <Field label="Show results to students">
          {(id) => (
            <Select id={id} value={f.show_results} onChange={(e) => setF({ ...f, show_results: e.target.value as ShowResults })}>
              <option value="immediately">Immediately after submitting</option>
              <option value="after_close">After the quiz closes</option>
              <option value="never">Never (instructors only)</option>
            </Select>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Toggle checked={f.show_correct_answers} onChange={(v) => setF({ ...f, show_correct_answers: v })} label="Reveal correct answers" description="Shown together with results." />
          <Toggle checked={f.shuffle_questions} onChange={(v) => setF({ ...f, shuffle_questions: v })} label="Shuffle questions" description="Different order per attempt." />
          <Toggle checked={f.shuffle_choices} onChange={(v) => setF({ ...f, shuffle_choices: v })} label="Shuffle answer choices" description="Multiple-choice only." />
        </div>
      </div>
    </Panel>
  );
}
