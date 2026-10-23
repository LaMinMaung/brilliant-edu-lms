import { useCallback, useState } from "react";
import { FolderPlus, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import type { Question, QuestionCategory, QuestionType } from "../../lib/types-phase2";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { cx } from "../../lib/format";
import { QUESTION_TYPE_LABEL } from "../../lib/quiz";
import { createQuestionCategory, deleteQuestion, deleteQuestionCategory, listQuestionCategories, listQuestions, renameQuestionCategory } from "../../services/quizzes";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Select } from "../ui/Field";
import { SearchInput } from "../ui/SearchInput";
import { EmptyState, ErrorState, Loading } from "../ui/States";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { QuestionModal } from "./QuestionModal";

export function QuestionBank({ courseId }: { courseId: string }) {
  const toast = useToast();
  const [category, setCategory] = useState("");
  const [type, setType] = useState<QuestionType | "">("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Question | null | "new">(null);
  const [removing, setRemoving] = useState<Question | null>(null);
  const [removingCat, setRemovingCat] = useState<QuestionCategory | null>(null);
  const cats = useLoader(() => listQuestionCategories(courseId), [courseId]);
  const qs = useLoader(() => listQuestions(courseId, { categoryId: category, type, search }), [courseId, category, type, search]);
  const onSearch = useCallback((v: string) => setSearch(v), []);

  const addCategory = async () => {
    const name = window.prompt("New category name");
    if (!name?.trim()) return;
    try {
      await createQuestionCategory(courseId, name.trim(), (cats.data || []).length);
      toast("Category created");
      cats.reload();
    } catch (err) { toast(errorMessage(err), "error"); }
  };
  const rename = async (c: QuestionCategory) => {
    const name = window.prompt("Rename category", c.name);
    if (!name?.trim() || name === c.name) return;
    try { await renameQuestionCategory(c.id, name.trim()); cats.reload(); qs.reload(); } catch (err) { toast(errorMessage(err), "error"); }
  };

  const categories = cats.data || [];
  const catButton = (value: string, label: string) => (
    <button onClick={() => setCategory(value)} aria-pressed={category === value}
      className={cx("w-full truncate rounded-md px-3 py-1.5 text-left text-sm", category === value ? "bg-marker-soft font-medium" : "hover:bg-paper-2")}>
      {label}
    </button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="rounded-lg border border-rule bg-paper p-3 lg:self-start">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Categories</p>
          <button onClick={addCategory} className="rounded p-1 text-ink-3 hover:bg-paper-3 hover:text-ink" aria-label="Add category"><FolderPlus className="size-4" /></button>
        </div>
        <ul className="flex flex-col gap-0.5">
          <li>{catButton("", "All questions")}</li>
          <li>{catButton("none", "Uncategorised")}</li>
          {categories.map((c) => (
            <li key={c.id} className="group flex items-center">
              {catButton(c.id, c.name)}
              <button onClick={() => rename(c)} className="hidden rounded p-1 text-ink-3 hover:text-ink group-hover:block" aria-label={`Rename ${c.name}`}><Pencil className="size-3.5" /></button>
              <button onClick={() => setRemovingCat(c)} className="hidden rounded p-1 text-ink-3 hover:text-brick group-hover:block" aria-label={`Delete ${c.name}`}><Trash2 className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      </aside>

      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          <SearchInput value={search} onChange={onSearch} placeholder="Search questions" />
          <Select value={type} onChange={(e) => setType(e.target.value as QuestionType | "")} className="w-auto min-w-40" aria-label="Filter by type">
            <option value="">All types</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="true_false">True / false</option>
            <option value="short_answer">Short answer</option>
          </Select>
          <Button className="ml-auto" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>New question</Button>
        </div>
        {qs.error ? <ErrorState message={qs.error} onRetry={qs.reload} /> : !qs.data ? <Loading /> : !qs.data.length ? (
          <EmptyState icon={<ListChecks className="size-5" />} title="No questions here" message="Build a reusable bank of questions, then add them to any quiz in this course."
            action={<Button size="sm" onClick={() => setEditing("new")}>Create a question</Button>} />
        ) : (
          <ul className="flex flex-col gap-2">
            {qs.data.map((q) => (
              <li key={q.id} className="flex items-start gap-3 rounded-md border border-rule bg-paper px-4 py-3 hover:border-ink-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 whitespace-pre-line text-sm">{q.prompt}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone="info">{QUESTION_TYPE_LABEL[q.type]}</Badge>
                    {q.expand?.category && <Badge>{q.expand.category.name}</Badge>}
                    <span className="font-mono text-[11px] text-ink-3">{q.points || 1} pt{q.points === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <button onClick={() => setEditing(q)} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-ink" aria-label="Edit question"><Pencil className="size-4" /></button>
                <button onClick={() => setRemoving(q)} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-brick" aria-label="Delete question"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <QuestionModal open={editing !== null} onClose={() => setEditing(null)} courseId={courseId} categories={categories}
        question={editing === "new" ? null : editing} defaultCategory={category} onSaved={() => { toast("Question saved"); qs.reload(); }} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title="Delete question?"
        message="The question is removed from the bank and from every quiz that uses it. Past attempts keep their scores, but this question's text will no longer be shown in their review."
        confirmLabel="Delete" onConfirm={async () => {
          if (!removing) return;
          try { await deleteQuestion(removing.id); toast("Question deleted"); qs.reload(); } catch (err) { toast(errorMessage(err), "error"); }
        }} />
      <ConfirmDialog open={!!removingCat} onClose={() => setRemovingCat(null)} title="Delete category?"
        message={`"${removingCat?.name}" will be deleted. Its questions are kept and become uncategorised.`}
        confirmLabel="Delete" onConfirm={async () => {
          if (!removingCat) return;
          try { await deleteQuestionCategory(removingCat.id); if (category === removingCat.id) setCategory(""); toast("Category deleted"); cats.reload(); qs.reload(); }
          catch (err) { toast(errorMessage(err), "error"); }
        }} />
    </div>
  );
}
