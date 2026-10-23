import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cx } from "../../lib/format";

interface Props {
  label: string;
  value: number | string | null | undefined;
  hint?: ReactNode;
  icon?: ReactNode;
  to?: string;
  emphasis?: boolean;
}

export function StatCard({ label, value, hint, icon, to, emphasis }: Props) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">{label}</span>
        {icon && <span className="text-ink-3" aria-hidden>{icon}</span>}
      </div>
      <div className="mt-3 font-display text-[2rem] font-semibold leading-none tabular-nums">
        {value === null || value === undefined ? (
          <span className="inline-block h-7 w-12 animate-pulse rounded bg-paper-3" />
        ) : emphasis ? (
          <span className="marker">{value}</span>
        ) : (
          value
        )}
      </div>
      {hint && <div className="mt-2 text-xs text-ink-3">{hint}</div>}
    </>
  );
  const cls = cx(
    "block rounded-lg border border-rule bg-paper p-4 transition-colors",
    to && "hover:border-ink-3 hover:bg-paper-2",
  );
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}
