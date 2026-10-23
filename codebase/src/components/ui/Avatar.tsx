import type { User } from "../../lib/types";
import { cx, initials } from "../../lib/format";
import { fileUrl } from "../../services/files";

const SIZES = { xs: "size-6 text-[10px]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-20 text-2xl" };

export function Avatar({ user, size = "sm", className }: { user?: User | null; size?: keyof typeof SIZES; className?: string }) {
  const src = user?.avatar ? fileUrl(user, user.avatar, "100x100") : "";
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-rule bg-marker-soft font-medium text-ink",
        SIZES[size],
        className,
      )}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(user?.name || user?.email)}
    </span>
  );
}
