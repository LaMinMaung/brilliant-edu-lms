import { useState } from "react";
import { Download, ExternalLink, FileText, Link2, Loader2, Trash2 } from "lucide-react";
import type { Material } from "../../lib/types";
import { fileExtension, formatBytes } from "../../lib/format";
import { isSafeUrl } from "../../lib/sanitize";
import { protectedFileUrl } from "../../services/files";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** A single learning material. Files are fetched with a short-lived access token. */
export function MaterialItem({ material: m, onDelete }: { material: Material; onDelete?: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (m.kind === "link") {
      if (isSafeUrl(m.url)) window.open(m.url, "_blank", "noopener,noreferrer");
      return;
    }
    // Open the tab synchronously (avoids popup blockers), then point it at the tokenised URL.
    const win = window.open("about:blank", "_blank");
    if (win) win.opener = null;
    setBusy(true);
    try {
      const url = await protectedFileUrl(m, m.file);
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch (err) {
      win?.close();
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const Icon = m.kind === "link" ? Link2 : FileText;
  return (
    <li className="group flex items-center gap-3 rounded-md border border-rule bg-paper px-3 py-2.5 transition-colors hover:border-ink-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded border border-rule bg-paper-2 text-ink-2" aria-hidden>
        {m.kind === "file" ? <span className="font-mono text-[9px] font-medium">{fileExtension(m.file)}</span> : <Icon className="size-4" />}
      </span>
      <button type="button" onClick={open} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium group-hover:underline">{m.title}</span>
        <span className="block truncate text-xs text-ink-3">
          {m.description || (m.kind === "link" ? hostOf(m.url) : m.original_name || "Download file")}
          {m.kind === "file" && m.size_bytes > 0 && <span className="font-mono"> · {formatBytes(m.size_bytes)}</span>}
        </span>
      </button>
      <button type="button" onClick={open} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-ink" aria-label={m.kind === "link" ? `Open ${m.title}` : `Download ${m.title}`}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : m.kind === "link" ? <ExternalLink className="size-4" /> : <Download className="size-4" />}
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-brick" aria-label={`Remove ${m.title}`}>
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  );
}
