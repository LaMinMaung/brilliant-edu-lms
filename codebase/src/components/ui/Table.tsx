import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "../../lib/format";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-rule bg-paper">
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cx(
        "border-b border-rule bg-paper-2 px-4 py-2.5 text-left font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ink-3",
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx("border-b border-rule px-4 py-3 align-middle", className)} {...rest} />;
}

export function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return <p className="mt-3 font-mono text-xs text-ink-3">{total} total</p>;
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <p className="font-mono text-xs text-ink-3">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-rule-strong p-1.5 hover:bg-paper-3 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md border border-rule-strong p-1.5 hover:bg-paper-3 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
