import { Link } from "react-router-dom";
import { ArrowRight, Award, CheckCircle2, Circle, CircleDot } from "lucide-react";
import type { ActivityProgress, Course, Enrollment } from "../../lib/types";
import { RichText } from "../editor/RichText";
import { ButtonLink } from "../ui/Button";
import { ProgressRing } from "../ui/Progress";
import { EmptyState } from "../ui/States";
import type { OutlineSection } from "./usePlayer";

interface Props {
  course: Course;
  outline: OutlineSection[];
  enrollment: Enrollment | null;
  progress: Map<string, ActivityProgress>;
  nextLessonId?: string;
  started: boolean;
}

export function CourseOverview({ course, outline, enrollment, progress, nextLessonId, started }: Props) {
  const completed = enrollment?.completion_status === "completed";
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Course overview</p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-[2.4rem]">{course.title}</h1>
      {course.summary && <p className="mt-3 text-lg text-ink-2">{course.summary}</p>}

      {enrollment && (
        <div className="mt-8 flex flex-col gap-5 rounded-lg border border-rule bg-paper-2 p-5 sm:flex-row sm:items-center">
          <ProgressRing value={enrollment.progress} />
          <div className="flex-1">
            {completed ? (
              <p className="flex items-center gap-2 font-display text-xl font-semibold"><Award className="size-5 text-moss" aria-hidden /> Course completed</p>
            ) : (
              <p className="font-display text-xl font-semibold">{started ? "Keep going" : "Ready when you are"}</p>
            )}
            <p className="mt-1 text-sm text-ink-2">{enrollment.completed_count || 0} of {enrollment.total_count || 0} tracked lessons complete.</p>
          </div>
          {nextLessonId && (
            <ButtonLink to={`/learn/courses/${course.id}/play/${nextLessonId}`} icon={<ArrowRight className="size-4" />}>
              {completed ? "Review" : started ? "Continue" : "Start course"}
            </ButtonLink>
          )}
        </div>
      )}

      {course.description && <div className="mt-10"><RichText html={course.description} /></div>}

      <section className="mt-10" aria-labelledby="outline-heading">
        <h2 id="outline-heading" className="mb-4 font-display text-xl font-semibold">What's inside</h2>
        {outline.length === 0 ? (
          <EmptyState title="No lessons yet" message="Content for this course hasn't been published yet." />
        ) : (
          <ol className="flex flex-col gap-4">
            {outline.map((s, i) => (
              <li key={s.id} className="rounded-lg border border-rule">
                <div className="border-b border-rule px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Section {i + 1}</p>
                  <p className="font-display font-semibold">{s.title}</p>
                  {s.summary && <p className="mt-0.5 text-sm text-ink-2">{s.summary}</p>}
                </div>
                <ul>
                  {s.lessons.map((l) => {
                    const p = progress.get(l.id);
                    const Icon = p?.completed ? CheckCircle2 : p ? CircleDot : Circle;
                    return (
                      <li key={l.id}>
                        <Link to={`/learn/courses/${course.id}/play/${l.id}`} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-paper-2">
                          <Icon className={p?.completed ? "size-4 text-moss" : "size-4 text-ink-3"} aria-label={p?.completed ? "Completed" : p ? "Started" : "Not started"} />
                          <span className="flex-1">{l.title}</span>
                          {l.estimated_minutes > 0 && <span className="font-mono text-[11px] text-ink-3">{l.estimated_minutes} min</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
