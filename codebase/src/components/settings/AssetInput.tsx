import { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";

interface Props {
  label: string;
  hint: string;
  currentUrl?: string;
  accept: string[];
  maxBytes: number;
  file: File | null;
  removed: boolean;
  onFile: (f: File | null) => void;
  onRemove: () => void;
  onError: (msg: string) => void;
  square?: boolean;
}

/** Small image picker used for the logo and favicon. */
export function AssetInput({ label, hint, currentUrl, accept, maxBytes, file, removed, onFile, onRemove, onError, square }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const shown = preview || (!removed ? currentUrl : undefined);

  const pick = (f?: File) => {
    if (!f) return;
    if (!accept.includes(f.type)) return onError(`${label}: unsupported file type.`);
    if (f.size > maxBytes) return onError(`${label}: file is larger than ${Math.round(maxBytes / 1024)} KB.`);
    onFile(f);
  };

  return (
    <div className="flex items-center gap-4">
      <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-rule bg-paper-2 ${square ? "size-14" : "h-14 w-28"}`}>
        {shown ? <img src={shown} alt={`${label} preview`} className="max-h-full max-w-full object-contain" /> : <span className="text-[11px] text-ink-3">None</span>}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-xs text-ink-3">{hint}</p>
        <div className="mt-1.5 flex gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-rule-strong px-3 text-[13px] font-medium hover:bg-paper-2">
            <ImagePlus className="size-4" aria-hidden /> {shown ? "Replace" : "Upload"}
            <input type="file" accept={accept.join(",")} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {shown && <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => { onFile(null); onRemove(); }}>Remove</Button>}
        </div>
      </div>
    </div>
  );
}
