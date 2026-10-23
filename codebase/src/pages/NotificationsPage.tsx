import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ClipboardCheck, GraduationCap, ListChecks, Megaphone, MessageSquare, Clock, Inbox, Trash2 } from "lucide-react";
import type { AppNotification, NotificationType } from "../lib/types-phase2";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Tabs } from "../components/ui/Tabs";
import { Pagination } from "../components/ui/Table";
import { EmptyState, ErrorState, Loading } from "../components/ui/States";
import { useCurrentUser } from "../hooks/useAuth";
import { useLoader } from "../hooks/useLoader";
import { useToast } from "../hooks/useToast";
import { announceNotificationsChanged } from "../hooks/useUnreadCount";
import { errorMessage } from "../lib/errors";
import { cx, timeAgo } from "../lib/format";
import { deleteNotification, listNotifications, markAllRead, markRead } from "../services/notifications";

const ICON: Record<NotificationType, typeof Bell> = {
  announcement: Megaphone,
  deadline: Clock,
  assignment_graded: GraduationCap,
  quiz_result: ListChecks,
  discussion_reply: MessageSquare,
  submission_received: ClipboardCheck,
  grading_needed: Inbox,
};

export default function NotificationsPage() {
  const { user } = useCurrentUser();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const list = useLoader(() => listNotifications(user.id, { unreadOnly: tab === "unread", page }), [user.id, tab, page]);

  const open = async (n: AppNotification) => {
    if (!n.read) {
      try { await markRead(n.id); announceNotificationsChanged(); } catch (err) { console.error(err); }
    }
    if (n.link && n.link.startsWith("/")) navigate(n.link);
    else list.reload();
  };

  const readAll = async () => {
    try {
      const n = await markAllRead(user.id);
      toast(n ? `Marked ${n} as read` : "Nothing unread");
      announceNotificationsChanged();
      list.reload();
    } catch (err) { toast(errorMessage(err), "error"); }
  };

  const remove = async (n: AppNotification) => {
    try { await deleteNotification(n.id); announceNotificationsChanged(); list.reload(); } catch (err) { toast(errorMessage(err), "error"); }
  };

  return (
    <>
      <PageHeader eyebrow="Account" title="Notifications" description="Announcements, grades, quiz results, deadlines and replies."
        actions={<Button variant="secondary" size="sm" icon={<CheckCheck className="size-4" />} onClick={readAll}>Mark all as read</Button>} />
      <Tabs tabs={[{ key: "all", label: "All" }, { key: "unread", label: "Unread" }]} active={tab} onChange={(t) => { setTab(t as "all" | "unread"); setPage(1); }} />
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data ? <Loading /> : !list.data.items.length ? (
        <EmptyState icon={<Bell className="size-5" />} title={tab === "unread" ? "You're all caught up" : "No notifications yet"} message="You'll be notified about course announcements, grades and replies." />
      ) : (
        <>
          <ul className="overflow-hidden rounded-lg border border-rule bg-paper">
            {list.data.items.map((n) => {
              const Icon = ICON[n.type] || Bell;
              return (
                <li key={n.id} className={cx("group flex items-start gap-3 border-b border-rule px-4 py-3.5 last:border-0", !n.read && "bg-marker-soft/40")}>
                  <span className={cx("mt-0.5 rounded-md border p-1.5", n.read ? "border-rule text-ink-3" : "border-marker-deep/30 bg-marker-soft text-ink")} aria-hidden><Icon className="size-4" /></span>
                  <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                    <span className={cx("block text-sm", !n.read && "font-semibold")}>{n.title}{!n.read && <span className="sr-only"> (unread)</span>}</span>
                    {n.body && <span className="mt-0.5 block text-sm text-ink-2">{n.body}</span>}
                    <span className="mt-1 block text-xs text-ink-3">{n.expand?.course?.title ? `${n.expand.course.title} · ` : ""}{timeAgo(n.created)}</span>
                  </button>
                  {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-marker-deep" aria-hidden />}
                  <button onClick={() => remove(n)} className="rounded p-1.5 text-ink-3 opacity-0 hover:bg-paper-3 hover:text-brick focus:opacity-100 group-hover:opacity-100" aria-label="Delete notification">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.totalItems} onPage={setPage} />
        </>
      )}
    </>
  );
}
