import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Lock, Pencil, Pin, Trash2, Unlock } from "lucide-react";
import type { User } from "../../lib/types";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { displayName, formatDateTime } from "../../lib/format";
import { createReply, deleteReply, deleteTopic, getTopic, listReplies, updateReply, updateTopic } from "../../services/community";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Field";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ErrorState, Loading } from "../ui/States";

/** One topic with replies. Bodies are plain text rendered by React (no HTML), so user content can't inject markup. */
export function TopicView({ topicId, canModerate, backHref }: { topicId: string; canModerate: boolean; backHref: string }) {
  const { user } = useCurrentUser();
  const toast = useToast();
  const navigate = useNavigate();
  const data = useLoader(async () => {
    const [topic, replies] = await Promise.all([getTopic(topicId), listReplies(topicId)]);
    return { topic, replies };
  }, [topicId]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [removing, setRemoving] = useState<{ kind: "topic" | "reply"; id: string } | null>(null);

  if (data.error) return <ErrorState message="This topic isn't available. It may have been deleted." />;
  if (!data.data) return <Loading />;
  const { topic, replies } = data.data;
  const canReply = !topic.locked || canModerate;
  const mine = (authorId: string) => authorId === user.id;

  const post = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      const r = await createReply(topic, user.id, reply.trim());
      data.setData({ topic: { ...topic, reply_count: topic.reply_count + 1 }, replies: [...replies, r] });
      setReply("");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editing || !editing.body.trim()) return;
    try {
      if (editing.id === topic.id) {
        const t = await updateTopic(topic.id, { body: editing.body.trim() });
        data.setData({ topic: t, replies });
      } else {
        const r = await updateReply(editing.id, editing.body.trim());
        data.setData({ topic, replies: replies.map((x) => (x.id === r.id ? r : x)) });
      }
      setEditing(null);
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  const moderate = async (patch: { pinned?: boolean; locked?: boolean }) => {
    try { data.setData({ topic: await updateTopic(topic.id, patch), replies }); } catch (err) { toast(errorMessage(err), "error"); }
  };

  const renderPost = ({ id, authorId, author, body, created, edited }: { id: string; authorId: string; author?: User; body: string; created: string; edited?: boolean }) => (
    <article key={id} className="flex gap-3">
      <Avatar user={author} />
      <div className="min-w-0 flex-1 rounded-lg border border-rule bg-paper p-4">
        <header className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <span className="font-medium text-ink">{displayName(author)}</span>
          <time dateTime={created}>{formatDateTime(created)}</time>
          {edited && <span>· edited</span>}
          <span className="ml-auto flex">
            {mine(authorId) && (!topic.locked || canModerate) && (
              <button onClick={() => setEditing({ id, body })} className="rounded p-1 hover:bg-paper-3 hover:text-ink" aria-label="Edit"><Pencil className="size-3.5" /></button>
            )}
            {(mine(authorId) || canModerate) && (
              <button onClick={() => setRemoving({ kind: id === topic.id ? "topic" : "reply", id })} className="rounded p-1 hover:bg-paper-3 hover:text-brick" aria-label="Delete"><Trash2 className="size-3.5" /></button>
            )}
          </span>
        </header>
        {editing?.id === id ? (
          <div className="flex flex-col gap-2">
            <Textarea value={editing.body} onChange={(e) => setEditing({ id, body: e.target.value })} rows={4} aria-label="Edit message" />
            <div className="flex gap-2"><Button size="sm" onClick={saveEdit}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{body}</p>
        )}
      </div>
    </article>
  );

  return (
    <div className="flex flex-col gap-5">
      <Link to={backHref} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft className="size-4" aria-hidden /> All discussions</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">{topic.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {topic.pinned && <Badge tone="marker"><Pin className="size-3" aria-hidden /> Pinned</Badge>}
          {topic.locked && <Badge><Lock className="size-3" aria-hidden /> Locked</Badge>}
          {canModerate && (
            <>
              <Button size="sm" variant="secondary" icon={<Pin className="size-4" />} onClick={() => moderate({ pinned: !topic.pinned })}>{topic.pinned ? "Unpin" : "Pin"}</Button>
              <Button size="sm" variant="secondary" icon={topic.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />} onClick={() => moderate({ locked: !topic.locked })}>{topic.locked ? "Unlock" : "Lock"}</Button>
            </>
          )}
        </div>
      </div>
      {renderPost({ id: topic.id, authorId: topic.author, author: topic.expand?.author, body: topic.body, created: topic.created })}
      <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">{replies.length} repl{replies.length === 1 ? "y" : "ies"}</h3>
      <div className="flex flex-col gap-3 sm:pl-8">
        {replies.map((r) => renderPost({ id: r.id, authorId: r.author, author: r.expand?.author, body: r.body, created: r.created, edited: r.edited }))}
      </div>
      {canReply ? (
        <div className="flex flex-col gap-2 sm:pl-8">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={10000} placeholder="Write a reply…" aria-label="Reply" />
          <div><Button onClick={post} loading={busy} disabled={!reply.trim()}>Post reply</Button></div>
        </div>
      ) : (
        <p className="rounded-md bg-paper-2 px-3 py-2 text-sm text-ink-2"><Lock className="mr-1 inline size-3.5" aria-hidden />This topic is locked. New replies are closed.</p>
      )}
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title={removing?.kind === "topic" ? "Delete topic?" : "Delete reply?"}
        message={removing?.kind === "topic" ? "The topic and all its replies will be permanently deleted." : "This reply will be permanently deleted."}
        confirmLabel="Delete" onConfirm={async () => {
          if (!removing) return;
          try {
            if (removing.kind === "topic") { await deleteTopic(removing.id); toast("Topic deleted"); navigate(backHref); }
            else { await deleteReply(removing.id); data.setData({ topic: { ...topic, reply_count: Math.max(0, topic.reply_count - 1) }, replies: replies.filter((x) => x.id !== removing.id) }); toast("Reply deleted"); }
          } catch (err) { toast(errorMessage(err), "error"); }
        }} />
    </div>
  );
}
