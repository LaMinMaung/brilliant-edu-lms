import { useCallback, useEffect, useMemo, useState } from "react";
import type { Activity, ActivityProgress, Course, Enrollment, Section } from "../../lib/types";
import { useCurrentUser } from "../../hooks/useAuth";
import { errorMessage } from "../../lib/errors";
import { getCourse } from "../../services/courses";
import { listActivities, listSections } from "../../services/curriculum";
import { getEnrollment } from "../../services/enrollments";
import { listMyProgress } from "../../services/progress";

export interface OutlineSection extends Section {
  lessons: Activity[];
}

export type PlayerMode = "learner" | "preview" | "denied";

export function usePlayer(courseId: string) {
  const { user, can } = useCurrentUser();
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<ActivityProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [c, s, a, e] = await Promise.all([getCourse(courseId), listSections(courseId), listActivities(courseId), getEnrollment(user.id, courseId)]);
        const p = e ? await listMyProgress(user.id, courseId) : [];
        if (!alive) return;
        setCourse(c); setSections(s); setActivities(a); setEnrollment(e); setProgress(p);
      } catch (err) {
        if (alive) setError(errorMessage(err, "This course isn't available."));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [courseId, user.id]);

  const isStaff = !!course && (can("courses.manage_all") || course.owner === user.id || course.instructors.includes(user.id));
  const mode: PlayerMode = enrollment?.status === "active" ? "learner" : isStaff ? "preview" : "denied";

  const outline = useMemo<OutlineSection[]>(() => {
    const visible = (x: { is_published: boolean }) => mode === "preview" || x.is_published;
    return sections
      .filter(visible)
      .map((s) => ({ ...s, lessons: activities.filter((a) => a.section === s.id && visible(a)) }))
      .filter((s) => s.lessons.length > 0 || mode === "preview");
  }, [sections, activities, mode]);

  const ordered = useMemo(() => outline.flatMap((s) => s.lessons), [outline]);
  const progressByLesson = useMemo(() => new Map(progress.map((p) => [p.activity, p])), [progress]);

  const upsertProgress = useCallback((p: ActivityProgress) => {
    setProgress((prev) => (prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p]));
  }, []);

  const refreshEnrollment = useCallback(async () => {
    setEnrollment(await getEnrollment(user.id, courseId));
  }, [user.id, courseId]);

  /** Reload completion records after the server marks a quiz/assignment complete. */
  const refreshProgress = useCallback(async () => {
    const [e, p] = await Promise.all([getEnrollment(user.id, courseId), listMyProgress(user.id, courseId)]);
    setEnrollment(e);
    setProgress(p);
  }, [user.id, courseId]);

  return { user, course, outline, ordered, enrollment, progressByLesson, mode, isStaff, loading, error, upsertProgress, refreshEnrollment, refreshProgress };
}
