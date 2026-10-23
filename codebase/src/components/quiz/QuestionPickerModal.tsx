import { useEffect, useState } from "react";
import type { Question, QuestionCategory, QuestionType } from "../../lib/types-phase2";
import { useLoader } from "../../hooks/useLoader";
import { cx } from "../../lib/format";
import { QUESTION_TYPE_LABEL } from "../../lib/quiz";
import { listQuestions } from "../../services/quizzes";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Select } from "../ui/Field";
import { Badge } from "../ui/Badge";
import { Loading } from "../ui/States";

interface Props {
  open: boolean;
  onClose: () => void;
  courseId: string;
  categories: QuestionCategory[];
  excludeIds: string[];
  onPick: (questions: Question[]) => Promise<void>;
}

export function QuestionPickerModal({ open, onClose, courseId, categories, excludeIds, onPick }: Props) {
  const [category, setCategory] = useState("");
  const [type, setType] = useState<QuestionType | "">("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const list = useLoader(() => (open ? listQuestions(courseId, { categoryId: category, type }) : Promise.resolve([])), [open, courseId, category, type]);
  useEffect(() => { if (open) setSelected([]); }, [open]);

  const available = (list.data || []).filter((q) => !excludeIds.includes(q.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const add = async () => {
    setBusy(true);
    try {
      await onPick(available.filter((q) => selected.includes(q.id)));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Add questions from the bank"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={add} loading={busy} disabled={!selected.length}>Add {selected.length || ""} question{selected.length === 1 ? "" : "s"}</Button></>}>
      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto min-w-44" aria-label="Category">
          <option value="">All categories</option>
          <option value="none">Uncategorised</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value as QuestionType | "")} className="w-auto min-w-40" aria-label="Type">
          <option value="">All types</option>
          <option value="multiple_choice">Multiple choice</option>
          <option value="true_false">True / false</option>
          <option value="short_answer">Short answer</option>
        </Select>
      </div>
      {list.loading ? <Loading /> : !available.length ? (
        <p className="py-8 text-center text-sm text-ink-3">No more questions match. Create new questions in the Question bank tab or with “New question”.</p>
      ) : (
        <ul className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto">
          {available.map((q) => {
            const on = selected.includes(q.id);
            return (
              <li key={q.id}>
                <label className={cx("flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5", on ? "border-ink bg-marker-soft" : "border-rule hover:bg-paper-2")}>
                  <input type="checkbox" checked={on} onChange={() => toggle(q.id)} className="mt-1 size-4 accent-[var(--color-ink)]" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm">{q.prompt}</span>
                    <span className="mt-1 flex gap-2"><Badge tone="info">{QUESTION_TYPE_LABEL[q.type]}</Badge><span className="font-mono text-[11px] text-ink-3">{q.points || 1} pts</span></span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
