import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface State {
  error: Error | null;
}

/** Catches unexpected rendering errors and shows a friendly message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6">
        <div className="max-w-md rounded-lg border border-rule bg-paper p-8 text-center shadow-sm" role="alert">
          <AlertTriangle className="mx-auto size-8 text-brick" aria-hidden />
          <h1 className="mt-4 font-display text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-2">An unexpected error occurred while showing this page. Your data is safe. Try reloading; if it keeps happening, contact your administrator.</p>
          <div className="mt-6 flex justify-center gap-2">
            <button onClick={() => window.location.reload()} className="h-10 rounded-md bg-ink px-4 text-sm font-medium text-paper hover:bg-night-2">Reload page</button>
            <a href="/app" className="inline-flex h-10 items-center rounded-md border border-rule-strong px-4 text-sm font-medium hover:bg-paper-2">Go to dashboard</a>
          </div>
        </div>
      </div>
    );
  }
}
