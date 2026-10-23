import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./Button";

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-3" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}…
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-brick/25 bg-brick-soft px-6 py-10 text-center" role="alert">
      <AlertTriangle className="size-6 text-brick" aria-hidden />
      <p className="max-w-md text-sm text-ink">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="ruled flex flex-col items-center gap-2 rounded-lg border border-dashed border-rule-strong px-6 py-12 text-center">
      {icon && <div className="mb-1 rounded-full border border-rule bg-paper p-3 text-ink-2" aria-hidden>{icon}</div>}
      <h3 className="font-display text-lg font-semibold"><span className="bg-paper px-1">{title}</span></h3>
      {message && <p className="max-w-sm bg-paper px-1 text-sm text-ink-2">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
