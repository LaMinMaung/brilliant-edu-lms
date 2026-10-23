import { useRef, useState } from "react";
import { Link2, Loader2, Upload } from "lucide-react";
import type { Material } from "../../lib/types";
import { useLoader } from "../../hooks/useLoader";
import { useSettings } from "../../hooks/useSettings";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { createMaterial, deleteMaterial, listMaterials } from "../../services/curriculum";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { MaterialItem } from "./MaterialItem";
import { LinkModal } from "./LinkModal";
import { ALLOWED_EXTENSIONS, SERVER_MAX_MB, validateUpload } from "./materialTypes";

export function MaterialsManager({ courseId, activityId }: { courseId: string; activityId: string }) {
  const toast = useToast();
  const { settings } = useSettings();
  const maxMb = Math.min(settings?.max_upload_mb || SERVER_MAX_MB, SERVER_MAX_MB);
  const data = useLoader(() => listMaterials(activityId), [activityId]);
  const [uploading, setUploading] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [removing, setRemoving] = useState<Material | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const items = data.data || [];

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    for (const file of list) {
      const problem = validateUpload(file, maxMb);
      if (problem) { toast(problem, "error"); continue; }
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append("course", courseId);
        fd.append("activity", activityId);
        fd.append("kind", "file");
        fd.append("title", file.name.replace(/\.[^.]+$/, ""));
        fd.append("sort_order", String(items.length));
        fd.append("file", file);
        await createMaterial(fd);
        toast(`Uploaded ${file.name}`);
      } catch (err) {
        toast(errorMessage(err), "error");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    data.reload();
  };

  return (
    <Panel title="Learning materials" description="Files and links attached to this lesson. Only enrolled learners can open them."
      actions={<Button size="sm" variant="secondary" icon={<Link2 className="size-4" />} onClick={() => setLinkOpen(true)}>Add link</Button>}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
        className={`mb-4 flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-6 text-center transition-colors ${dragging ? "border-ink bg-marker-soft" : "border-rule-strong bg-paper-2"}`}
      >
        {uploading > 0 ? <Loader2 className="size-5 animate-spin text-ink-2" aria-hidden /> : <Upload className="size-5 text-ink-3" aria-hidden />}
        <p className="text-sm">
          {uploading > 0 ? `Uploading ${uploading} file${uploading > 1 ? "s" : ""}…` : <>Drag files here or <button type="button" onClick={() => input.current?.click()} className="font-medium underline underline-offset-2">browse</button></>}
        </p>
        <p className="text-xs text-ink-3">PDF, Office/OpenDocument, text, images or ZIP · up to {maxMb} MB each</p>
        <input ref={input} type="file" multiple className="sr-only" accept={ALLOWED_EXTENSIONS.map((e) => "." + e).join(",")}
          onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ""; }} />
      </div>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((m) => <MaterialItem key={m.id} material={m} onDelete={() => setRemoving(m)} />)}
        </ul>
      ) : !data.loading && <p className="text-center text-sm text-ink-3">No materials attached yet.</p>}

      <LinkModal open={linkOpen} onClose={() => setLinkOpen(false)} courseId={courseId} activityId={activityId} nextOrder={items.length}
        onSaved={() => { toast("Link added"); data.reload(); }} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title="Remove material?" message={`"${removing?.title}" will be permanently removed from this lesson.`}
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing) return;
          try { await deleteMaterial(removing.id); toast("Material removed"); data.reload(); }
          catch (err) { toast(errorMessage(err), "error"); }
        }} />
    </Panel>
  );
}
