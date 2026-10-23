import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Choice, Question, QuestionCategory, QuestionType } from "../../lib/types-phase2";
import { useCurrentUser } from "../../hooks/useAuth";
import { errorMessage } from "../../lib/errors";
import { cx } from "../../lib/format";
import { newChoiceId, validateQuestion } from "../../lib/quiz";
import { createQuestion, updateQuestion, type QuestionInput } from "../../services/quizzes";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea, Toggle } from "../ui/Field";
import { FormError } from "../auth/AuthLayout";

interface Props {
  open: boolean;
  onClose: () => void;
  courseId: string;
  categories: QuestionCategory[];
  question?: Question | null;
  defaultCategory?: string;
  onSaved: (q: Question) => void;
}

const blank = (): QuestionInput => ({
  type: "multiple_choice",
  prompt: "",
  choices: [{ id: newChoiceId(), text: "" }, { id: newChoiceId(), text: "" }],
  answer: [],
  multiple: false,
  case_sensitive: false,
  points: 1,
  feedback: "",
  category: "",
});

export function QuestionModal({ open, onClose, courseId, categories, question, defaultCategory = "", onSaved }: Props) {
  const { user } = useCurrentUser();
  const [q, setQ] = useState<QuestionInput>(blank());
  const [accepted, setAccepted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (question) {
      setQ({ type: question.type, prompt: question.prompt, choices: question.choices || [], answer: question.answer, multiple: question.multiple,
        case_sensitive: question.case_sensitive, points: question.points || 1, feedback: question.feedback, category: question.category });
      setAccepted(question.type === "short_answer" && Array.isArray(question.answer) ? question.answer.join("\n") : "");
    } else {
      setQ({ ...blank(), category: defaultCategory === "none" ? "" : defaultCategory });
      setAccepted("");
    }
  }, [open, question, defaultCategory]);

  const set = <K extends keyof QuestionInput>(k: K, v: QuestionInput[K]) => setQ((p) => ({ ...p, [k]: v }));
  const correct = Array.isArray(q.answer) ? q.answer : [];
  const choices = q.choices || [];

  const changeType = (t: QuestionType) => {
    setQ((p) => ({
      ...p,
      type: t,
      answer: t === "true_false" ? "true" : [],
      choices: t === "multiple_choice" ? (p.choices?.length ? p.choices : blank().choices) : null,
    }));
  };
  const setChoice = (id: string, text: string) => set("choices", choices.map((c) => (c.id === id ? { ...c, text } : c)));
  const removeChoice = (id: string) => { set("choices", choices.filter((c) => c.id !== id)); set("answer", correct.filter((x) => x !== id)); };
  const toggleCorrect = (id: string) =>
    set("answer", q.multiple ? (correct.includes(id) ? correct.filter((x) => x !== id) : [...correct, id]) : [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: QuestionInput = {
      ...q,
      prompt: q.prompt.trim(),
      choices: q.type === "multiple_choice" ? choices.filter((c: Choice) => c.text.trim()).map((c) => ({ ...c, text: c.text.trim() })) : null,
      answer: q.type === "short_answer" ? accepted.split("\n").map((s) => s.trim()).filter(Boolean) : q.answer,
      multiple: q.type === "multiple_choice" ? q.multiple : false,
    };
    const problem = validateQuestion(payload);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      const saved = question ? await updateQuestion(question.id, payload) : await createQuestion(courseId, user.id, payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={question ? "Edit question" : "New question"}
      description="Questions live in this course's bank and can be reused across quizzes. Answer keys are never sent to students."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="question-form" loading={busy}>{question ? "Save question" : "Add question"}</Button></>}>
      <form id="question-form" onSubmit={submit} className="flex flex-col gap-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Type">
            {(id) => (
              <Select id={id} value={q.type} onChange={(e) => changeType(e.target.value as QuestionType)}>
                <option value="multiple_choice">Multiple choice</option>
                <option value="true_false">True / false</option>
                <option value="short_answer">Short answer</option>
              </Select>
            )}
          </Field>
          <Field label="Category">
            {(id) => (
              <Select id={id} value={q.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">Uncategorised</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Default points">{(id) => <Input id={id} type="number" min={0.5} step={0.5} value={q.points} onChange={(e) => set("points", Number(e.target.value))} />}</Field>
        </div>
        <Field label="Question" required>{(id) => <Textarea id={id} value={q.prompt} onChange={(e) => set("prompt", e.target.value)} rows={3} maxLength={5000} />}</Field>

        {q.type === "multiple_choice" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[13px] font-medium">Choices <span className="font-normal text-ink-3">— tick the correct answer{q.multiple ? "s" : ""}</span></legend>
            {choices.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <input type={q.multiple ? "checkbox" : "radio"} name="correct" checked={correct.includes(c.id)} onChange={() => toggleCorrect(c.id)}
                  aria-label={`Choice ${i + 1} is correct`} className="size-4 accent-[var(--color-ink)]" />
                <Input value={c.text} onChange={(e) => setChoice(c.id, e.target.value)} placeholder={`Choice ${i + 1}`} aria-label={`Choice ${i + 1}`}
                  className={cx(correct.includes(c.id) && "border-moss bg-moss-soft")} />
                <button type="button" onClick={() => removeChoice(c.id)} disabled={choices.length <= 2} className="rounded p-1.5 text-ink-3 hover:text-brick disabled:opacity-30" aria-label={`Remove choice ${i + 1}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => set("choices", [...choices, { id: newChoiceId(), text: "" }])} disabled={choices.length >= 10}>Add choice</Button>
              <Toggle checked={q.multiple} onChange={(v) => { set("multiple", v); if (!v) set("answer", correct.slice(0, 1)); }} label="Allow multiple correct answers" description="Students must select all correct choices." />
            </div>
          </fieldset>
        )}

        {q.type === "true_false" && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">Correct answer</legend>
            <div className="flex gap-2">
              {["true", "false"].map((v) => (
                <button key={v} type="button" onClick={() => set("answer", v)} aria-pressed={q.answer === v}
                  className={cx("h-10 flex-1 rounded-md border text-sm font-medium", q.answer === v ? "border-moss bg-moss-soft text-moss" : "border-rule-strong hover:bg-paper-2")}>
                  {v === "true" ? "True" : "False"}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {q.type === "short_answer" && (
          <div className="flex flex-col gap-3">
            <Field label="Accepted answers" hint="One per line. Matching answers are graded automatically; anything else goes to your grading queue for review.">
              {(id) => <Textarea id={id} value={accepted} onChange={(e) => setAccepted(e.target.value)} rows={3} placeholder={"photosynthesis\nphoto-synthesis"} />}
            </Field>
            <Toggle checked={q.case_sensitive} onChange={(v) => set("case_sensitive", v)} label="Case sensitive" description="Extra spaces are always ignored." />
          </div>
        )}

        <Field label="Explanation / feedback" hint="Shown with results when the quiz reveals correct answers.">
          {(id) => <Textarea id={id} value={q.feedback} onChange={(e) => set("feedback", e.target.value)} rows={2} maxLength={2000} />}
        </Field>
      </form>
    </Modal>
  );
}
