import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "../../lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const first = ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])");
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="animate-fade absolute inset-0 bg-night/50" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cx(
          "animate-rise relative flex max-h-[92vh] w-full flex-col rounded-t-lg border border-rule bg-paper shadow-2xl sm:rounded-lg",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
          <div>
            <h2 id="modal-title" className="font-display text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
          </div>
          <button data-close onClick={onClose} className="rounded p-1 text-ink-3 hover:bg-paper-3 hover:text-ink" aria-label="Close dialog">
            <X className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-rule bg-paper-2 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}
