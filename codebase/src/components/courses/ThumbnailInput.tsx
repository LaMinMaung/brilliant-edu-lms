import { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";

const MAX = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface Props {
  currentUrl?: string;
  file: File | null;
  removed: boolean;
  onFile: (f: File | null) => void;
  onRemove: () => void;
  onError: (msg: string) => void;
}

export function ThumbnailInput({ currentUrl, file, removed, onFile, onRemove, onError }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview || (!removed ? currentUrl : undefined);

  const pick = (f?: File) => {
    if (!f) return;
    if (!TYPES.includes(f.type)) return onError("Thumbnail must be a JPG, PNG, WEBP or GIF image.");
    if (f.size > MAX) return onError("Thumbnail must be 5 MB or smaller.");
    onFile(f);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="aspect-video w-full overflow-hidden rounded-md border border-rule bg-paper-2 sm:w-56">
        {shown ? (
          <img src={shown} alt="Course thumbnail preview" className="size-full object-cover" />
        ) : (
          <div className="ruled flex size-full items-center justify-center text-xs text-ink-3">No image</div>
        )}
      </div>
      <div className="flex gap-2">
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-rule-strong px-3 text-[13px] font-medium hover:bg-paper-2">
          <ImagePlus className="size-4" aria-hidden /> {shown ? "Replace" : "Upload image"}
          <input type="file" accept={TYPES.join(",")} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {shown && (
          <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => { onFile(null); onRemove(); }}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
