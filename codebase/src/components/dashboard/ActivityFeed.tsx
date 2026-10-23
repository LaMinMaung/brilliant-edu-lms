import { LogIn, BookPlus, UserPlus, UserCheck, Activity } from "lucide-react";
import type { ActivityLog } from "../../lib/types";
import { displayName, timeAgo } from "../../lib/format";

const ICONS: Record<string, typeof Activity> = {
  "auth.login": LogIn,
  "course.created": BookPlus,
  "enrollment.created": UserCheck,
  "user.created": UserPlus,
};

export function ActivityFeed({ items, showActor = true }: { items: ActivityLog[]; showActor?: boolean }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-3">No activity recorded yet.</p>;
  return (
    <ul className="flex flex-col">
      {items.map((l) => {
        const Icon = ICONS[l.action] || Activity;
        return (
          <li key={l.id} className="flex items-start gap-3 border-b border-rule py-2.5 last:border-0">
            <span className="mt-0.5 rounded-md border border-rule bg-paper-2 p-1.5 text-ink-2" aria-hidden>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              {showActor && <span className="font-medium">{displayName(l.expand?.actor)} </span>}
              <span className="text-ink-2">{l.description}</span>
            </div>
            <time className="shrink-0 font-mono text-[11px] text-ink-3" dateTime={l.created}>{timeAgo(l.created)}</time>
          </li>
        );
      })}
    </ul>
  );
}
