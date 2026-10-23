import { CheckCircle2, Circle, Eye, MinusCircle } from "lucide-react";
import type { Activity, ActivityProgress } from "../../lib/types";
import { formatDateTime } from "../../lib/format";
import { Button } from "../ui/Button";

interface Props {
  lesson: Activity;
  progress?: ActivityProgress;
  mode: "learner" | "preview";
  busy: boolean;
  onToggle: () => void;
}

export function CompletionControl({ lesson, progress, mode, busy, onToggle }: Props) {
  if (lesson.completion_mode === "none") {
    return <p className="flex items-center gap-2 text-sm text-ink-3"><MinusCircle className="size-4" aria-hidden /> This lesson doesn't count toward progress.</p>;
  }
  if (mode === "preview") {
    return <p className="text-sm text-ink-3">Preview mode: completion isn't recorded for staff.</p>;
  }
  if (lesson.completion_mode === "view") {
    return (
      <p className="flex items-center gap-2 text-sm text-moss" role="status">
        <Eye className="size-4" aria-hidden /> Completed automatically when opened{progress?.completed_at ? ` · ${formatDateTime(progress.completed_at)}` : ""}.
      </p>
    );
  }
  const done = !!progress?.completed;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={onToggle} loading={busy} variant={done ? "secondary" : "marker"}
        icon={done ? <CheckCircle2 className="size-4 text-moss" /> : <Circle className="size-4" />} aria-pressed={done}>
        {done ? "Completed" : "Mark as complete"}
      </Button>
      {done && progress?.completed_at && <span className="text-xs text-ink-3">Completed {formatDateTime(progress.completed_at)} · click to undo</span>}
    </div>
  );
}
