import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Paperclip } from "lucide-react";
import type { Activity, ActivityProgress } from "../../lib/types";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { cx } from "../../lib/format";
import { getActivity, listMaterials } from "../../services/curriculum";
import { recordAccess, setCompleted } from "../../services/progress";
import { RichText } from "../editor/RichText";
import { MaterialItem } from "../materials/MaterialItem";
import { ErrorState, Loading } from "../ui/States";
import { CompletionControl } from "./CompletionControl";

interface Props {
  courseId: string;
  userId: string;
  lessonId: string;
  mode: "learner" | "preview";
  sectionTitle: string;
  position: { index: number; total: number };
  prev?: Activity;
  next?: Activity;
  progress?: ActivityProgress;
  onProgress: (p: ActivityProgress) => void;
}

export function LessonView({ courseId, userId, lessonId, mode, sectionTitle, position, prev, next, progress, onProgress }: Props) {
  const toast = useToast();
  const data = useLoader(async () => {
    const [lesson, materials] = await Promise.all([getActivity(lessonId), listMaterials(lessonId)]);
    return { lesson, materials };
  }, [lessonId]);
  const [busy, setBusy] = useState(false);
  const accessed = useRef<string | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const lesson = data.data?.lesson;
    if (mode !== "learner" || !lesson || lesson.id !== lessonId || accessed.current === lessonId) return;
    accessed.current = lessonId;
    recordAccess(progressRef.current, { userId, courseId, activityId: lessonId, autoComplete: lesson.completion_mode === "view" })
      .then(onProgress)
      .catch((err) => console.error("Failed to record lesson access", err));
  }, [data.data, lessonId, mode, userId, courseId, onProgress]);

  useEffect(() => { window.scrollTo(0, 0); }, [lessonId]);

  if (data.error) return <div className="p-6"><ErrorState message="This lesson isn't available. It may be unpublished or you may not have access." onRetry={data.reload} /></div>;
  if (!data.data || data.data.lesson.id !== lessonId) return <Loading label="Opening lesson" />;
  const { lesson, materials } = data.data;

  const toggle = async () => {
    setBusy(true);
    try {
      const current = progressRef.current;
      const saved = current
        ? await setCompleted(current.id, !current.completed)
        : await recordAccess(undefined, { userId, courseId, activityId: lessonId, autoComplete: true });
      onProgress(saved);
      if (saved.completed) toast(next ? "Lesson complete. On to the next one." : "Lesson complete.");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const done = !!progress?.completed;

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        {sectionTitle} · Lesson {position.index + 1} of {position.total}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-[2.4rem]">{lesson.title}</h1>
      {lesson.description && <p className="mt-3 text-lg text-ink-2">{lesson.description}</p>}
      {lesson.estimated_minutes > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-3"><Clock className="size-4" aria-hidden /> About {lesson.estimated_minutes} min</p>
      )}

      <div className="mt-8 border-t border-rule pt-8">
        {lesson.content ? <RichText html={lesson.content} /> : <p className="text-ink-3">This lesson has no written content{materials.length ? "; see the materials below." : "."}</p>}
      </div>

      {materials.length > 0 && (
        <section className="mt-10" aria-labelledby="materials-heading">
          <h2 id="materials-heading" className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><Paperclip className="size-4" aria-hidden /> Learning materials</h2>
          <ul className="flex flex-col gap-2">{materials.map((m) => <MaterialItem key={m.id} material={m} />)}</ul>
        </section>
      )}

      <div className="mt-10 rounded-lg border border-rule bg-paper-2 p-4">
        <CompletionControl lesson={lesson} progress={progress} mode={mode} busy={busy} onToggle={toggle} />
      </div>

      <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Lesson navigation">
        {prev ? (
          <Link to={`/learn/courses/${courseId}/play/${prev.id}`} className="group rounded-lg border border-rule p-4 hover:border-ink-3">
            <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-ink-3"><ArrowLeft className="size-3.5" aria-hidden /> Previous</span>
            <span className="mt-1 block truncate font-medium group-hover:underline">{prev.title}</span>
          </Link>
        ) : <span className="hidden sm:block" />}
        {next ? (
          <Link to={`/learn/courses/${courseId}/play/${next.id}`}
            className={cx("group rounded-lg border p-4 text-right", done ? "border-marker-deep/40 bg-marker-soft hover:border-ink" : "border-rule hover:border-ink-3")}>
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
