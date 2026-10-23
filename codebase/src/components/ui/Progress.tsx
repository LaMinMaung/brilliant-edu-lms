import { cx } from "../../lib/format";

/** Signature element: progress drawn as a highlighter stroke on a ruled line. */
export function ProgressBar({ value, size = "md", showLabel, className }: { value: number; size?: "sm" | "md"; showLabel?: boolean; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className={cx("flex items-center gap-3", className)}>
      <div
        className={cx("relative flex-1 overflow-hidden rounded-[2px] bg-paper-3", size === "sm" ? "h-1.5" : "h-2.5")}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% complete`}
      >
        <div
          className={cx("animate-draw absolute inset-y-0 left-0 origin-left", pct === 100 ? "bg-moss" : "bg-marker")}
          style={{ width: `${pct}%`, borderRadius: "1px 6px 3px 1px" }}
        />
      </div>
      {showLabel && <span className="w-10 text-right font-mono text-xs tabular-nums text-ink-2">{pct}%</span>}
    </div>
  );
}

export function ProgressRing({ value, size = 96, label }: { value: number; size?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${pct}% ${label || "complete"}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-paper-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={pct === 100 ? "var(--color-moss)" : "var(--color-marker)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <span className="absolute font-mono text-lg font-medium tabular-nums">{pct}%</span>
    </div>
  );
}
