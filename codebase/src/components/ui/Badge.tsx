import type { ReactNode } from "react";
import { cx } from "../../lib/format";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "marker";

const TONES: Record<Tone, string> = {
  neutral: "bg-paper-3 text-ink-2 border-rule",
  success: "bg-moss-soft text-moss border-moss/25",
  warning: "bg-marker-soft text-marker-deep border-marker-deep/25",
  danger: "bg-brick-soft text-brick border-brick/25",
  info: "bg-slate-soft text-ink border-ink/15",
  marker: "bg-marker text-ink border-marker-deep/30",
};

export function Badge({ tone = "neutral", children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide",
        TONES[tone],
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const COURSE_TONE: Record<string, Tone> = { draft: "warning", published: "success", archived: "neutral" };
export function CourseStatusBadge({ status }: { status: string }) {
  return <Badge tone={COURSE_TONE[status] || "neutral"} dot>{status}</Badge>;
}

const COMPLETION: Record<string, { tone: Tone; label: string }> = {
  completed: { tone: "success", label: "Completed" },
  in_progress: { tone: "info", label: "In progress" },
  not_started: { tone: "neutral", label: "Not started" },
};
export function CompletionBadge({ status }: { status: string }) {
  const c = COMPLETION[status] || COMPLETION.not_started;
  return <Badge tone={c.tone}>{c.label}</Badge>;
}

export function UserStatusBadge({ status }: { status: string }) {
  return <Badge tone={status === "active" ? "success" : "danger"} dot>{status}</Badge>;
}
