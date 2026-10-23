import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Activity } from "../../lib/types";
import { ACTIVITY_LABEL } from "../curriculum/activityMeta";

interface Props {
  courseId: string;
  activity: Activity;
  sectionTitle: string;
  position: { index: number; total: number };
  prev?: Activity;
  next?: Activity;
  children: ReactNode;
}

/** Common frame for quiz/assignment views: where you are, title, and previous/next navigation. */
export function ActivityShell({ courseId, activity, sectionTitle, position, prev, next, children }: Props) {
  useEffect(() => { window.scrollTo(0, 0); }, [activity.id]);
  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        {sectionTitle} · {ACTIVITY_LABEL[activity.type]} · {position.index + 1} of {position.total}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-[2.4rem]">{activity.title}</h1>
      {activity.description && <p className="mt-3 text-lg text-ink-2">{activity.description}</p>}
      <div className="mt-8">{children}</div>
      <nav className="mt-10 grid gap-3 sm:grid-cols-2" aria-label="Activity navigation">
        {prev ? (
          <Link to={`/learn/courses/${courseId}/play/${prev.id}`} className="group rounded-lg border border-rule p-4 hover:border-ink-3">
            <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-ink-3"><ArrowLeft className="size-3.5" aria-hidden /> Previous</span>
            <span className="mt-1 block truncate font-medium group-hover:underline">{prev.title}</span>
          </Link>
        ) : <span className="hidden sm:block" />}
        {next ? (
          <Link to={`/learn/courses/${courseId}/play/${next.id}`} className="group rounded-lg border border-rule p-4 text-right hover:border-ink-3">
            <span className="flex items-center justify-end gap-1 font-mono text-[11px] uppercase tracking-wide text-ink-3">Next <ArrowRight className="size-3.5" aria-hidden /></span>
            <span className="mt-1 block truncate font-medium group-hover:underline">{next.title}</span>
          </Link>
        ) : (
          <Link to={`/learn/courses/${courseId}/play`} className="group rounded-lg border border-rule p-4 text-right hover:border-ink-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-3">End of course</span>
            <span className="mt-1 block font-medium group-hover:underline">Back to overview</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
