import { cx } from "../../lib/format";

interface Props<T extends string> {
  tabs: { key: T; label: string; count?: number }[];
  active: T;
  onChange: (key: T) => void;
}

export function Tabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-rule" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            "relative whitespace-nowrap px-3.5 pb-3 pt-1 text-sm font-medium transition-colors",
            active === t.key ? "text-ink" : "text-ink-3 hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 font-mono text-xs text-ink-3">{t.count}</span>}
          {active === t.key && <span className="animate-draw absolute inset-x-1 -bottom-px h-[3px] origin-left rounded-full bg-marker" />}
        </button>
      ))}
    </div>
  );
}
