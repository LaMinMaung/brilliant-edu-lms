import { Check } from "lucide-react";
import type { Permission } from "../../lib/types";
import { PERMISSION_GROUPS } from "../../lib/permissions";
import { cx } from "../../lib/format";

export function PermissionChecklist({ value, onChange, disabled }: { value: Permission[]; onChange: (v: Permission[]) => void; disabled?: boolean }) {
  const toggle = (p: Permission) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PERMISSION_GROUPS.map((g) => (
        <fieldset key={g.group}>
          <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">{g.group}</legend>
          <ul className="flex flex-col gap-1">
            {g.items.map((it) => {
              const on = value.includes(it.key);
              return (
                <li key={it.key}>
                  <label className={cx("flex items-start gap-2.5 rounded-md px-2 py-1.5", disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-paper-2")}>
                    <input type="checkbox" className="peer sr-only" checked={on} disabled={disabled} onChange={() => toggle(it.key)} />
                    <span className={cx("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[3px] border peer-focus-visible:ring-2 peer-focus-visible:ring-ink",
                      on ? "border-ink bg-ink text-marker" : "border-rule-strong bg-paper")} aria-hidden>
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{it.label}</span>
                      <span className="block text-xs text-ink-3">{it.hint}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}
