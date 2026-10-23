import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useUnreadCount } from "../../hooks/useUnreadCount";
import { cx } from "../../lib/format";

export function NotificationBell({ tone = "light", onNavigate }: { tone?: "light" | "dark"; onNavigate?: () => void }) {
  const { count } = useUnreadCount();
  return (
    <Link to="/notifications" onClick={onNavigate} aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
      className={cx("relative inline-flex rounded-md p-2 transition-colors", tone === "light" ? "text-paper/70 hover:bg-night-2 hover:text-paper" : "text-ink-2 hover:bg-paper-3 hover:text-ink")}>
      <Bell className="size-5" aria-hidden />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-marker px-1 font-mono text-[10px] font-semibold text-ink">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
