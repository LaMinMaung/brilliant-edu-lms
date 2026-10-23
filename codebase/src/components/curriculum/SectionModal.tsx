import { useEffect, useState } from "react";
import type { Section } from "../../lib/types";
import { errorMessage } from "../../lib/errors";
import { createSection, updateSection } from "../../services/curriculum";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, Textarea, Toggle } from "../ui/Field";
import { FormError } from "../auth/AuthLayout";

interface Props {
  open: boolean;
  onClose: () => void;
  courseId: string;
  section?: Section | null;
  nextOrder: number;
  onSaved: () => void;
}

export function SectionModal({ open, onClose, courseId, section, nextOrder, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(section?.title || "");
    setSummary(section?.summary || "");
    setPublished(section ? section.is_published : true);
    setError(null);
  }, [open, section]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Title is required.");
    setBusy(true);
    try {
      if (section) await updateSection(section.id, { title: title.trim(), summary, is_published: published });
      else await createSection({ course: courseId, title: title.trim(), summary, is_published: published, sort_order: nextOrder });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={section ? "Edit section" : "Add section"} description="Sections group related lessons, like chapters or weeks."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="section-form" loading={busy}>{section ? "Save" : "Add section"}</Button></>}>
      <form id="section-form" onSubmit={submit} className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Section title" required>{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Week 1: Foundations" />}</Field>
        <Field label="Summary" hint="Optional short overview shown to learners.">{(id) => <Textarea id={id} value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} maxLength={1000} />}</Field>
        <Toggle checked={published} onChange={setPublished} label="Visible to learners" description="Hidden sections and their lessons are not shown to students." />
      </form>
    </Modal>
  );
}
