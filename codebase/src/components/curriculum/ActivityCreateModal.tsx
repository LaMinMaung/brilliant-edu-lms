import { useEffect, useState } from "react";
import { ClipboardCheck, FileText, ListChecks } from "lucide-react";
import type { ActivityType, CompletionMode } from "../../lib/types";
import { errorMessage } from "../../lib/errors";
import { cx } from "../../lib/format";
import { createActivity } from "../../services/curriculum";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, Select } from "../ui/Field";
import { FormError } from "../auth/AuthLayout";
import { COMPLETION_OPTIONS, DEFAULT_COMPLETION } from "./activityMeta";

interface Props {
  open: boolean;
  onClose: () => void;
  courseId: string;
  sectionId: string;
  nextOrder: number;
  onCreated: (id: string) => void;
}

const TYPES: { type: ActivityType; label: string; hint: string; icon: typeof FileText }[] = [
  { type: "lesson", label: "Lesson", hint: "Content, files and links", icon: FileText },
  { type: "quiz", label: "Quiz", hint: "Auto-graded questions", icon: ListChecks },
  { type: "assignment", label: "Assignment", hint: "Text or file submissions", icon: ClipboardCheck },
];

export function ActivityCreateModal({ open, onClose, courseId, sectionId, nextOrder, onCreated }: Props) {
  const [type, setType] = useState<ActivityType>("lesson");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<CompletionMode>("manual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setType("lesson"); setTitle(""); setMode("manual"); setError(null); }
  }, [open]);

  const pickType = (t: ActivityType) => { setType(t); setMode(DEFAULT_COMPLETION[t]); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Title is required.");
    setBusy(true);
    try {
      const a = await createActivity({ course: courseId, section: sectionId, type, title: title.trim(), completion_mode: mode, sort_order: nextOrder, is_published: false });
      onCreated(a.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add activity" description="Activities start as drafts. Set them up, then publish."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="activity-form" loading={busy}>Create & edit</Button></>}>
      <form id="activity-form" onSubmit={submit} className="flex flex-col gap-4">
        <FormError message={error} />
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">Type</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {TYPES.map((t) => (
              <button key={t.type} type="button" role="radio" aria-checked={type === t.type} onClick={() => pickType(t.type)}
                className={cx("flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors", type === t.type ? "border-ink bg-marker-soft" : "border-rule-strong hover:bg-paper-2")}>
                <t.icon className="size-4" aria-hidden />
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-[11px] leading-tight text-ink-3">{t.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Title" required>{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />}</Field>
        <Field label="Completion" hint="How this activity counts toward course progress.">
          {(id) => (
            <Select id={id} value={mode} onChange={(e) => setMode(e.target.value as CompletionMode)}>
              {COMPLETION_OPTIONS[type].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          )}
        </Field>
      </form>
    </Modal>
  );
}
