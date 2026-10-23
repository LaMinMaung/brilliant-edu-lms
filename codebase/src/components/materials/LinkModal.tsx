import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { FormError } from "../auth/AuthLayout";
import { errorMessage } from "../../lib/errors";
import { isSafeUrl } from "../../lib/sanitize";
import { createMaterial } from "../../services/curriculum";

interface Props {
  open: boolean;
  onClose: () => void;
  courseId: string;
  activityId: string;
  nextOrder: number;
  onSaved: () => void;
}

export function LinkModal({ open, onClose, courseId, activityId, nextOrder, onSaved }: Props) {
  const [f, setF] = useState({ title: "", url: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setF({ title: "", url: "https://", description: "" }); setError(null); } }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return setError("Title is required.");
    if (!isSafeUrl(f.url)) return setError("Enter a valid URL starting with http:// or https://");
    setBusy(true);
    try {
      await createMaterial({ course: courseId, activity: activityId, kind: "link", title: f.title.trim(), url: f.url.trim(), description: f.description.trim(), sort_order: nextOrder });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add external link" description="Point learners to a reading, tool or reference elsewhere."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="link-form" loading={busy}>Add link</Button></>}>
      <form id="link-form" onSubmit={submit} className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Title" required>{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} />}</Field>
        <Field label="URL" required>{(id) => <Input id={id} type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} className="font-mono" />}</Field>
        <Field label="Description">{(id) => <Input id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={500} />}</Field>
      </form>
    </Modal>
  );
}
