import type { ReactNode } from "react";
import { cx } from "../../lib/format";

interface Props {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, description, actions, children, className, bodyClassName }: Props) {
  return (
    <section className={cx("rounded-lg border border-rule bg-paper", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 py-4">
          <div>
            {title && <h2 className="font-display text-lg font-semibold leading-tight text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
