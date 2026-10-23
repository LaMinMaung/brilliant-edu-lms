import { useEffect, useState } from "react";
import type { Announcement } from "../../lib/types-phase2";
import { errorMessage } from "../../lib/errors";
import { useCurrentUser } from "../../hooks/useAuth";
import { createAnnouncement, updateAnnouncement } from "../../services/community";
import { RichTextEditor } from "../editor/RichTextEditor";
import { FormError } from "../auth/AuthLayout";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, Toggle } from "../ui/Field";

export function AnnouncementModal({ open, onClose, courseId, announcement, onSaved }: { open: boolean; onClose: () => void; courseId: string; announcement?: Announcement | null; onSaved: () => void }) {
  const { user } = useCurrentUser();
  const [f, setF] = useState({ title: "", body: "", pinned: false, published: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(announcement ? { title: announcement.title, body: announcement.body, pinned: announcement.pinned, published: announcement.published } : { title: "", body: "", pinned: false, published: true });
  }, [open, announcement]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return setError("Title is required.");
    if (!f.body.trim()) return setError("Write the announcement text.");
    setBusy(true);
    try {
      if (announcement) await updateAnnouncement(announcement.id, { ...f, title: f.title.trim() });
      else await createAnnouncement(courseId, user.id, { ...f, title: f.title.trim() });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={announcement ? "Edit announcement" : "New announcement"}
      description="Published announcements notify every active learner in the course once."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="ann-form" loading={busy}>{announcement ? "Save" : f.published ? "Post announcement" : "Save draft"}</Button></>}>
      <form id="ann-form" onSubmit={save} className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Title" required>{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} />}</Field>
        <Field label="Message">{(id) => <RichTextEditor id={id} value={f.body} onChange={(v) => setF({ ...f, body: v })} placeholder="What do learners need to know?" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Toggle checked={f.published} onChange={(v) => setF({ ...f, published: v })} label="Published" description="Drafts are visible to staff only." />
          <Toggle checked={f.pinned} onChange={(v) => setF({ ...f, pinned: v })} label="Pin to top" />
        </div>
      </form>
    </Modal>
  );
}
