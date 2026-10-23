import { Link } from "react-router-dom";
import { PanelLeft, X } from "lucide-react";
import { BrandMark } from "../layout/Brand";
import { ProgressBar } from "../ui/Progress";
import { Badge } from "../ui/Badge";
import { NotificationBell } from "../notifications/NotificationBell";

interface Props {
  title: string;
  courseId: string;
  progress: number | null;
  preview: boolean;
  exitTo: string;
  onToggleOutline: () => void;
}

export function PlayerHeader({ title, courseId, progress, preview, exitTo, onToggleOutline }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-rule bg-paper/95 px-3 backdrop-blur sm:px-5">
      <button onClick={onToggleOutline} className="rounded-md p-2 text-ink-2 hover:bg-paper-3 hover:text-ink lg:hidden" aria-label="Toggle course outline">
        <PanelLeft className="size-5" />
      </button>
      <Link to={`/learn/courses/${courseId}/play`} className="hidden items-center gap-2.5 sm:flex" aria-label="Course overview">
        <BrandMark className="size-7" />
      </Link>
      <Link to={`/learn/courses/${courseId}/play`} className="min-w-0 flex-1 truncate font-display text-[1.05rem] font-semibold hover:underline">
        {title}
      </Link>
      {preview && <Badge tone="warning">Preview</Badge>}
      {progress !== null && <ProgressBar value={progress} showLabel className="hidden w-48 sm:flex" />}
      <NotificationBell tone="dark" />
      <Link to={exitTo} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-ink-2 hover:bg-paper-3 hover:text-ink" aria-label="Exit course">
        <X className="size-4" aria-hidden /> <span className="hidden md:inline">Exit</span>
      </Link>
    </header>
  );
}
