import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  crumbs?: Crumb[];
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-3">
        {items.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
            {c.to ? (
              <Link to={c.to} className="max-w-[16rem] truncate hover:text-ink hover:underline">{c.label}</Link>
            ) : (
              <span aria-current="page" className="max-w-[16rem] truncate text-ink-2">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ eyebrow, title, description, actions, crumbs }: Props) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
        {eyebrow && <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{eyebrow}</p>}
        <h1 className="font-display text-[1.9rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2.15rem]">{title}</h1>
        {description && <div className="mt-1.5 max-w-2xl text-[15px] text-ink-2">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
