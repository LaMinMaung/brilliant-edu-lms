import { ArrowRight } from "lucide-react";
import type { Enrollment } from "../../lib/types";
import { timeAgo } from "../../lib/format";
import { ButtonLink } from "../ui/Button";
import { ProgressRing } from "../ui/Progress";

export function playerPath(e: Enrollment) {
  return `/learn/courses/${e.course}/play${e.last_activity ? `/${e.last_activity}` : ""}`;
}

/** The single most important action for a learner: resume where they stopped. */
export function ContinueCard({ enrollment: e }: { enrollment: Enrollment }) {
  const course = e.expand?.course;
  return (
    <section className="ruled relative overflow-hidden rounded-lg border border-rule bg-paper p-6 sm:p-7" aria-label="Continue learning">
      <span className="absolute inset-y-0 left-10 hidden w-px bg-brick/30 sm:block" aria-hidden />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:pl-10">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            <span className="bg-paper px-1">{e.last_accessed ? `Continue · last opened ${timeAgo(e.last_accessed)}` : "Start here"}</span>
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold leading-tight sm:text-[1.75rem]">
            <span className="bg-paper px-1">{course?.title}</span>
          </h2>
          {e.expand?.last_activity && (
            <p className="mt-1.5 text-sm text-ink-2"><span className="bg-paper px-1">Last lesson: {e.expand.last_activity.title}</span></p>
          )}
          <p className="mt-1 font-mono text-xs text-ink-3"><span className="bg-paper px-1">{e.completed_count || 0} of {e.total_count || 0} lessons complete</span></p>
          <ButtonLink to={playerPath(e)} className="mt-5" icon={<ArrowRight className="size-4" />}>{e.last_accessed ? "Resume course" : "Start course"}</ButtonLink>
        </div>
        <div className="rounded-full bg-paper p-1"><ProgressRing value={e.progress} size={120} /></div>
      </div>
    </section>
  );
}
