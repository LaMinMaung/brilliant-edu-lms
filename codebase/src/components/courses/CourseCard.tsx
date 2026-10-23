import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Course } from "../../lib/types";
import { LEVEL_LABEL } from "../../lib/format";
import { CourseCover } from "./CourseCover";
import { CourseStatusBadge } from "../ui/Badge";
import { ProgressBar } from "../ui/Progress";

interface Props {
  course: Course;
  to: string;
  progress?: number;
  showStatus?: boolean;
  footer?: ReactNode;
}

export function CourseCard({ course, to, progress, showStatus, footer }: Props) {
  const instructors = course.expand?.instructors || [];
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-rule bg-paper transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-3 hover:shadow-[0_8px_24px_-12px_oklch(0.24_0.045_262/0.25)]">
      <Link to={to} className="block border-b border-rule" tabIndex={-1} aria-hidden>
        <CourseCover course={course} />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {course.expand?.category && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{course.expand.category.name}</span>
          )}
          {course.level && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">· {LEVEL_LABEL[course.level]}</span>}
          {showStatus && <span className="ml-auto"><CourseStatusBadge status={course.status} /></span>}
        </div>
        <h3 className="font-display text-[1.1rem] font-semibold leading-snug">
          <Link to={to} className="underline-offset-4 decoration-marker-deep group-hover:underline">{course.title}</Link>
        </h3>
        {course.summary && <p className="mt-1.5 line-clamp-2 text-sm text-ink-2">{course.summary}</p>}
        <div className="mt-auto pt-4">
          {instructors.length > 0 && (
            <p className="truncate text-xs text-ink-3">{instructors.map((i) => i.name || "Instructor").join(", ")}</p>
          )}
          {progress !== undefined && <ProgressBar value={progress} showLabel size="sm" className="mt-2" />}
          {footer}
        </div>
      </div>
    </article>
  );
}

export function CourseGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
