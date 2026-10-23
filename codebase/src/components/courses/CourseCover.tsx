import type { Course } from "../../lib/types";
import { cx } from "../../lib/format";
import { fileUrl } from "../../services/files";

/** Course thumbnail, or a typographic notebook cover when no image is uploaded. */
export function CourseCover({ course, className, thumb = "640x360" }: { course: Course; className?: string; thumb?: string }) {
  if (course.thumbnail) {
    return (
      <img
        src={fileUrl(course, course.thumbnail, thumb)}
        alt=""
        loading="lazy"
        className={cx("aspect-video w-full object-cover", className)}
      />
    );
  }
  const category = course.expand?.category?.name;
  return (
    <div className={cx("ruled relative flex aspect-video w-full flex-col justify-between overflow-hidden bg-paper-2 p-4", className)} aria-hidden>
      <span className="absolute inset-y-0 left-6 w-px bg-brick/30" />
      <span className="pl-5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{category || "Course"}</span>
      <span className="line-clamp-2 pl-5 font-display text-xl font-semibold leading-snug text-ink">
        <span className="marker">{course.title}</span>
      </span>
    </div>
  );
}
