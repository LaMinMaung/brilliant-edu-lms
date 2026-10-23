import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import type { Submission } from "../../lib/types-phase2";
import { errorMessage } from "../../lib/errors";
import { formatBytes, formatDateTime } from "../../lib/format";
import { protectedFileUrl } from "../../services/files";
import { useToast } from "../../hooks/useToast";
import { Badge } from "../ui/Badge";

function FileLink({ sub, file, label, size }: { sub: Submission; file: string; label: string; size?: number }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const open = async () => {
    const win = window.open("about:blank", "_blank");
    if (win) win.opener = null;
    setBusy(true);
    try {
      const url = await protectedFileUrl(sub, file);
      if (win) win.location.href = url; else window.location.href = url;
    } catch (err) {
      win?.close();
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={open} className="flex w-full items-center gap-2 rounded-md border border-rule px-3 py-2 text-left text-sm hover:border-ink-3">
      <FileText className="size-4 shrink-0 text-ink-3" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {size ? <span className="font-mono text-[11px] text-ink-3">{formatBytes(size)}</span> : null}
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4 text-ink-3" aria-hidden />}
    </button>
  );
}

/** One submission's content: text, private files (token-protected), timestamps and late flag. */
export function SubmissionContent({ sub, showGrade = true }: { sub: Submission; showGrade?: boolean }) {
  const meta = sub.file_meta || [];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <span className="font-mono">Submission #{sub.number}</span>
        <span>· {formatDateTime(sub.submitted_at)}</span>
        {sub.is_late && <Badge tone="danger">Late</Badge>}
        {sub.status === "graded" ? <Badge tone="success">Graded</Badge> : <Badge tone="warning">Awaiting grade</Badge>}
      </div>
      {sub.text && <div className="whitespace-pre-wrap rounded-md border border-rule bg-paper-2 p-3 text-sm leading-relaxed">{sub.text}</div>}
      {sub.files?.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {sub.files.map((f, i) => <li key={f}><FileLink sub={sub} file={f} label={meta[i]?.name || f} size={meta[i]?.size} /></li>)}
        </ul>
      )}
      {showGrade && sub.status === "graded" && (
        <div className="rounded-md border-l-2 border-moss bg-moss-soft px-3 py-2 text-sm">
          <p className="font-medium">Grade: {sub.grade}</p>
          {sub.feedback && <p className="mt-1 whitespace-pre-wrap text-ink-2">{sub.feedback}</p>}
        </div>
      )}
    </div>
  );
}
