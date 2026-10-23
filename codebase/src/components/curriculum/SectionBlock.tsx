import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, EyeOff, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import type { Activity } from "../../lib/types";
import type { SectionWithActivities } from "../../services/curriculum";
import { cx } from "../../lib/format";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ACTIVITY_ICON, ACTIVITY_LABEL, MODE_LABEL } from "./activityMeta";

interface Props {
  section: SectionWithActivities;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  base: string;
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onMoveLesson: (idx: number, dir: -1 | 1) => void;
  onToggleLesson: (a: Activity) => void;
  onDeleteLesson: (a: Activity) => void;
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className="rounded p-1.5 text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}

export function SectionBlock(p: Props) {
  const { section: s } = p;
  return (
    <li className={cx("rounded-lg border bg-paper", s.is_published ? "border-rule" : "border-dashed border-rule-strong")}>
      <header className="flex flex-wrap items-center gap-3 border-b border-rule px-4 py-3">
        <span className="font-mono text-xs text-ink-3">{String(p.index + 1).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[1.05rem] font-semibold">{s.title}</h3>
          {s.summary && <p className="truncate text-xs text-ink-3">{s.summary}</p>}
        </div>
        {!s.is_published && <Badge tone="warning">Hidden</Badge>}
        <div className="flex items-center">
          <IconBtn label="Move section up" onClick={() => p.onMove(-1)} disabled={p.isFirst}><ArrowUp className="size-4" /></IconBtn>
          <IconBtn label="Move section down" onClick={() => p.onMove(1)} disabled={p.isLast}><ArrowDown className="size-4" /></IconBtn>
          <IconBtn label={s.is_published ? "Hide section" : "Show section"} onClick={p.onTogglePublish}>
            {s.is_published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </IconBtn>
          <IconBtn label="Edit section" onClick={p.onEdit}><Pencil className="size-4" /></IconBtn>
          <IconBtn label="Delete section" onClick={p.onDelete}><Trash2 className="size-4" /></IconBtn>
        </div>
      </header>
      <ul>
        {s.activities.map((a, i) => {
          const Icon = ACTIVITY_ICON[a.type] || FileText;
          return (
          <li key={a.id} className="group flex flex-wrap items-center gap-3 border-b border-rule px-4 py-2.5 last:border-0 hover:bg-paper-2">
            <Icon className="size-4 shrink-0 text-ink-3" aria-label={ACTIVITY_LABEL[a.type]} />
            <Link to={`${p.base}/${s.course}/lessons/${a.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{a.title}</Link>
            {a.type !== "lesson" && <Badge tone="info">{ACTIVITY_LABEL[a.type]}</Badge>}
            <span className="hidden font-mono text-[10px] uppercase tracking-wide text-ink-3 sm:inline">{MODE_LABEL[a.completion_mode]}</span>
            <Badge tone={a.is_published ? "success" : "warning"}>{a.is_published ? "Published" : "Draft"}</Badge>
            <div className="flex items-center">
              <IconBtn label="Move lesson up" onClick={() => p.onMoveLesson(i, -1)} disabled={i === 0}><ArrowUp className="size-3.5" /></IconBtn>
              <IconBtn label="Move lesson down" onClick={() => p.onMoveLesson(i, 1)} disabled={i === s.activities.length - 1}><ArrowDown className="size-3.5" /></IconBtn>
              <IconBtn label={a.is_published ? "Unpublish lesson" : "Publish lesson"} onClick={() => p.onToggleLesson(a)}>
                {a.is_published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </IconBtn>
              <IconBtn label="Delete activity" onClick={() => p.onDeleteLesson(a)}><Trash2 className="size-3.5" /></IconBtn>
            </div>
          </li>
          );
        })}
      </ul>
      <div className="px-4 py-2.5">
        <Button variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={p.onAddLesson}>Add activity</Button>
      </div>
    </li>
  );
}
