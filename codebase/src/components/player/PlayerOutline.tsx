import { Link } from "react-router-dom";
import { CheckCircle2, Circle, CircleDot, EyeOff, GraduationCap, Home, Megaphone, MessagesSquare, MinusCircle } from "lucide-react";
import type { ActivityProgress } from "../../lib/types";
import { cx } from "../../lib/format";
import type { OutlineSection } from "./usePlayer";

interface Props {
  courseId: string;
  outline: OutlineSection[];
  currentId?: string;
  currentPage?: "activity" | "announcements" | "discussions" | "grades";
  progress: Map<string, ActivityProgress>;
  onNavigate?: () => void;
}

export function PlayerOutline({ courseId, outline, currentId, currentPage = "activity", progress, onNavigate }: Props) {
  let n = 0;
  const links = [
    { key: "activity", to: `/learn/courses/${courseId}/play`, label: "Overview", icon: Home, active: currentPage === "activity" && !currentId },
    { key: "announcements", to: `/learn/courses/${courseId}/announcements`, label: "Announcements", icon: Megaphone, active: currentPage === "announcements" },
    { key: "discussions", to: `/learn/courses/${courseId}/discussions`, label: "Discussions", icon: MessagesSquare, active: currentPage === "discussions" },
    { key: "grades", to: `/learn/courses/${courseId}/grades`, label: "Grades", icon: GraduationCap, active: currentPage === "grades" },
  ];
  return (
    <nav aria-label="Course outline" className="flex h-full flex-col overflow-y-auto bg-paper-2 pb-8">
      <ul className="grid grid-cols-2 gap-1 border-b border-rule p-2">
        {links.map((l) => (
          <li key={l.key}>
            <Link to={l.to} onClick={onNavigate} aria-current={l.active ? "page" : undefined}
              className={cx("flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium", l.active ? "bg-paper text-ink shadow-sm" : "text-ink-2 hover:bg-paper-3/60 hover:text-ink")}>
              <l.icon className="size-4" aria-hidden /> {l.label}
            </Link>
          </li>
        ))}
      </ul>
      {outline.map((s, si) => (
        <div key={s.id} className="border-b border-rule">
          <p className="flex items-center gap-2 px-5 pb-1.5 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            <span>Section {si + 1}</span>{!s.is_published && <EyeOff className="size-3" aria-label="Hidden section" />}
          </p>
          <p className="px-5 pb-2 font-display text-[0.98rem] font-semibold leading-snug">{s.title}</p>
          <ol className="pb-3">
            {s.lessons.map((l) => {
              n += 1;
              const p = progress.get(l.id);
              const current = l.id === currentId;
              const Icon = l.completion_mode === "none" ? MinusCircle : p?.completed ? CheckCircle2 : p ? CircleDot : Circle;
              const status = l.completion_mode === "none" ? "not tracked" : p?.completed ? "completed" : p ? "started" : "not started";
              return (
                <li key={l.id}>
                  <Link to={`/learn/courses/${courseId}/play/${l.id}`} onClick={onNavigate} aria-current={current ? "page" : undefined}
                    className={cx("relative flex items-start gap-2.5 px-5 py-2 text-sm transition-colors", current ? "bg-paper font-medium text-ink" : "text-ink-2 hover:bg-paper-3/60 hover:text-ink")}>
                    {current && <span className="absolute inset-y-1 left-0 w-1 rounded-r bg-marker" aria-hidden />}
                    <Icon className={cx("mt-0.5 size-4 shrink-0", p?.completed ? "text-moss" : "text-ink-3")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="sr-only">Activity {n}, {status}: </span>
                      {l.title}
                      {l.type !== "lesson" && <span className="ml-1.5 font-mono text-[10px] uppercase text-ink-3">{l.type}</span>}
                      {!l.is_published && <span className="ml-1.5 font-mono text-[10px] uppercase text-marker-deep">draft</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
            {!s.lessons.length && <li className="px-5 py-2 text-xs text-ink-3">No activities yet.</li>}
          </ol>
        </div>
      ))}
    </nav>
  );
}
