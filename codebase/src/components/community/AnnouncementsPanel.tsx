import { useState } from "react";
import { Megaphone, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import type { Announcement } from "../../lib/types-phase2";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { displayName, formatDateTime } from "../../lib/format";
import { deleteAnnouncement, listAnnouncements } from "../../services/community";
import { RichText } from "../editor/RichText";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState, ErrorState, Loading } from "../ui/States";
import { AnnouncementModal } from "./AnnouncementModal";

export function AnnouncementsPanel({ courseId, canManage }: { courseId: string; canManage: boolean }) {
  const toast = useToast();
  const list = useLoader(() => listAnnouncements(courseId), [courseId]);
  const [editing, setEditing] = useState<Announcement | null | "new">(null);
  const [removing, setRemoving] = useState<Announcement | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end"><Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>New announcement</Button></div>
      )}
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data ? <Loading /> : !list.data.length ? (
        <EmptyState icon={<Megaphone className="size-5" />} title="No announcements yet" message={canManage ? "Post updates, reminders and news for this course." : "Your instructors haven't posted anything yet."} />
      ) : (
        <ul className="flex flex-col gap-4">
          {list.data.map((a) => (
            <li key={a.id}>
              <article className="rounded-lg border border-rule bg-paper p-5">
                <header className="flex flex-wrap items-start gap-3">
                  <Avatar user={a.expand?.author} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold leading-snug">{a.title}</h3>
                    <p className="text-xs text-ink-3">
                      {displayName(a.expand?.author)} · <time dateTime={a.created}>{formatDateTime(a.created)}</time>
                      {a.updated !== a.created && " · edited"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {a.pinned && <Badge tone="marker"><Pin className="size-3" aria-hidden /> Pinned</Badge>}
                    {!a.published && <Badge tone="warning">Draft</Badge>}
                    {canManage && (
                      <>
                        <button onClick={() => setEditing(a)} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-ink" aria-label="Edit announcement"><Pencil className="size-4" /></button>
                        <button onClick={() => setRemoving(a)} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-brick" aria-label="Delete announcement"><Trash2 className="size-4" /></button>
                      </>
                    )}
                  </div>
                </header>
                <RichText html={a.body} className="mt-3 text-[15px]" />
              </article>
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <>
          <AnnouncementModal open={editing !== null} onClose={() => setEditing(null)} courseId={courseId} announcement={editing === "new" ? null : editing}
            onSaved={() => { toast("Announcement saved"); list.reload(); }} />
          <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title="Delete announcement?" message={`"${removing?.title}" will be removed for everyone.`}
            confirmLabel="Delete" onConfirm={async () => {
              if (!removing) return;
              try { await deleteAnnouncement(removing.id); toast("Announcement deleted"); list.reload(); } catch (err) { toast(errorMessage(err), "error"); }
            }} />
        </>
      )}
    </div>
  );
}
