import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, MessagesSquare, Pin, Plus } from "lucide-react";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { displayName, timeAgo } from "../../lib/format";
import { createTopic, listTopics } from "../../services/community";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { SearchInput } from "../ui/SearchInput";
import { EmptyState, ErrorState, Loading } from "../ui/States";
import { FormError } from "../auth/AuthLayout";
import { TopicView } from "./TopicView";

interface Props {
  courseId: string;
  canModerate: boolean;
  topicId?: string;
  topicHref: (id: string) => string;
  listHref: string;
}

/** Course discussion board: topic list, or a single topic when topicId is set. */
export function DiscussionBoard({ courseId, canModerate, topicId, topicHref, listHref }: Props) {
  if (topicId) return <TopicView topicId={topicId} canModerate={canModerate} backHref={listHref} />;
  return <TopicList courseId={courseId} topicHref={topicHref} />;
}

function TopicList({ courseId, topicHref }: { courseId: string; topicHref: (id: string) => string }) {
  const { user } = useCurrentUser();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useLoader(() => listTopics(courseId, search), [courseId, search]);
  const onSearch = useCallback((v: string) => setSearch(v), []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim() || !f.body.trim()) return setError("Add a title and a message.");
    setBusy(true);
    try {
      await createTopic(courseId, user.id, f.title.trim(), f.body.trim());
      toast("Topic posted");
      setOpen(false);
      setF({ title: "", body: "" });
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <SearchInput value={search} onChange={onSearch} placeholder="Search discussions" />
        <Button className="ml-auto" icon={<Plus className="size-4" />} onClick={() => { setError(null); setOpen(true); }}>New topic</Button>
      </div>
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data ? <Loading /> : !list.data.length ? (
        <EmptyState icon={<MessagesSquare className="size-5" />} title={search ? "No matching topics" : "No discussions yet"} message="Ask a question or start a conversation with your class." />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-rule bg-paper">
          {list.data.map((t) => (
            <li key={t.id} className="border-b border-rule last:border-0">
              <Link to={topicHref(t.id)} className="flex items-start gap-3 px-4 py-3.5 hover:bg-paper-2">
                <Avatar user={t.expand?.author} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {t.pinned && <Pin className="size-3.5 text-marker-deep" aria-label="Pinned" />}
                    {t.locked && <Lock className="size-3.5 text-ink-3" aria-label="Locked" />}
                    <span className="truncate">{t.title}</span>
                  </p>
                  <p className="line-clamp-1 text-sm text-ink-2">{t.body}</p>
                  <p className="mt-0.5 text-xs text-ink-3">{displayName(t.expand?.author)} · active {timeAgo(t.last_activity_at || t.created)}</p>
                </div>
                <Badge>{t.reply_count} repl{t.reply_count === 1 ? "y" : "ies"}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New discussion topic"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="topic-form" loading={busy}>Post topic</Button></>}>
        <form id="topic-form" onSubmit={create} className="flex flex-col gap-4">
          <FormError message={error} />
          <Field label="Title" required>{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} />}</Field>
          <Field label="Message" required>{(id) => <Textarea id={id} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={6} maxLength={10000} />}</Field>
        </form>
      </Modal>
    </div>
  );
}
