import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import type { ActivityProgress } from "../../lib/types";
import { useAuth } from "../../hooks/useAuth";
import { ErrorState, Loading } from "../../components/ui/States";
import { PlayerHeader } from "../../components/player/PlayerHeader";
import { PlayerOutline } from "../../components/player/PlayerOutline";
import { LessonView } from "../../components/player/LessonView";
import { QuizView } from "../../components/player/QuizView";
import { AssignmentView } from "../../components/player/AssignmentView";
import { ActivityShell } from "../../components/player/ActivityShell";
import { CourseOverview } from "../../components/player/CourseOverview";
import { usePlayer } from "../../components/player/usePlayer";
import { AnnouncementsPanel } from "../../components/community/AnnouncementsPanel";
import { DiscussionBoard } from "../../components/community/DiscussionBoard";
import { MyGrades } from "../../components/grades/MyGrades";

export type PlayerPage = "activity" | "announcements" | "discussions" | "grades";

export function pageFromPath(pathname: string): PlayerPage {
  if (/\/announcements\/?$/.test(pathname)) return "announcements";
  if (/\/discussions(\/[^/]+)?\/?$/.test(pathname)) return "discussions";
  if (/\/grades\/?$/.test(pathname)) return "grades";
  return "activity";
}

const PAGE_TITLE: Record<Exclude<PlayerPage, "activity">, string> = { announcements: "Announcements", discussions: "Discussions", grades: "My grades" };

export default function CoursePlayer() {
  const { id = "", lessonId, topicId } = useParams();
  const { role } = useAuth();
  const { pathname } = useLocation();
  const page = pageFromPath(pathname);
  const p = usePlayer(id);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const { upsertProgress, refreshEnrollment, refreshProgress } = p;

  useEffect(() => setOutlineOpen(false), [pathname]);

  const onProgress = useCallback(
    (rec: ActivityProgress) => {
      upsertProgress(rec);
      refreshEnrollment().catch((err) => console.error("Failed to refresh enrollment", err));
    },
    [upsertProgress, refreshEnrollment],
  );
  const onCompletionMaybeChanged = useCallback(() => {
    refreshProgress().catch((err) => console.error("Failed to refresh progress", err));
  }, [refreshProgress]);

  if (p.loading) return <Loading label="Opening course" />;
  if (p.error || !p.course) return <div className="mx-auto max-w-lg p-10"><ErrorState message={p.error || "Course not found."} /></div>;
  if (p.mode === "denied") return <Navigate to={`/learn/catalog/${id}`} replace />;

  const manageBase = role?.dashboard === "admin" ? "/admin/courses" : "/teach/courses";
  const exitTo = p.mode === "preview" ? `${manageBase}/${id}` : "/learn";
  const idx = lessonId ? p.ordered.findIndex((l) => l.id === lessonId) : -1;
  const current = page === "activity" && idx >= 0 ? p.ordered[idx] : undefined;
  const section = current ? p.outline.find((s) => s.id === current.section) : undefined;
  const firstOpen = p.ordered.find((l) => l.completion_mode !== "none" && !p.progressByLesson.get(l.id)?.completed);
  const nextLessonId = firstOpen?.id || p.enrollment?.last_activity || p.ordered[0]?.id;
  const outlineProps = { courseId: id, outline: p.outline, currentId: current?.id, currentPage: page, progress: p.progressByLesson };
  const mode = p.mode === "learner" ? "learner" : "preview";

  const renderMain = () => {
    if (page !== "activity") {
      return (
        <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{p.course!.title}</p>
          <h1 className="mb-6 mt-2 font-display text-3xl font-semibold tracking-tight">{PAGE_TITLE[page]}</h1>
          {page === "announcements" && <AnnouncementsPanel courseId={id} canManage={p.isStaff} />}
          {page === "discussions" && (
            <DiscussionBoard courseId={id} canModerate={p.isStaff} topicId={topicId}
              topicHref={(t) => `/learn/courses/${id}/discussions/${t}`} listHref={`/learn/courses/${id}/discussions`} />
          )}
          {page === "grades" && <MyGrades courseId={id} />}
        </div>
      );
    }
    if (lessonId && !current) return <div className="mx-auto max-w-lg p-10"><ErrorState message="This activity isn't available. It may have been unpublished or removed." /></div>;
    if (!current || !section) {
      return <CourseOverview course={p.course!} outline={p.outline} enrollment={p.mode === "learner" ? p.enrollment : null} progress={p.progressByLesson} nextLessonId={nextLessonId} started={p.progressByLesson.size > 0} />;
    }
    const common = { courseId: id, sectionTitle: section.title, position: { index: idx, total: p.ordered.length }, prev: p.ordered[idx - 1], next: p.ordered[idx + 1] };
    if (current.type === "quiz" || current.type === "assignment") {
      const View = current.type === "quiz" ? QuizView : AssignmentView;
      return (
        <ActivityShell key={current.id} activity={current} {...common}>
          <View courseId={id} userId={p.user.id} activity={current} mode={mode} progress={p.progressByLesson.get(current.id)} onProgress={onProgress} onCompletionMaybeChanged={onCompletionMaybeChanged} />
        </ActivityShell>
      );
    }
    return <LessonView key={current.id} userId={p.user.id} lessonId={current.id} mode={mode} progress={p.progressByLesson.get(current.id)} onProgress={onProgress} {...common} />;
  };

  return (
    <div className="min-h-screen bg-paper">
      <PlayerHeader
        title={p.course.title}
        courseId={id}
        progress={p.mode === "learner" ? p.enrollment?.progress ?? 0 : null}
        preview={p.mode === "preview"}
        exitTo={exitTo}
        onToggleOutline={() => setOutlineOpen((o) => !o)}
      />
      <div className="lg:grid lg:grid-cols-[300px_1fr]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] border-r border-rule lg:block">
          <PlayerOutline {...outlineProps} />
        </aside>
        {outlineOpen && (
          <div className="fixed inset-0 top-14 z-20 lg:hidden">
            <div className="animate-fade absolute inset-0 bg-night/40" onClick={() => setOutlineOpen(false)} aria-hidden />
            <div className="animate-rise absolute inset-y-0 left-0 w-[min(86vw,320px)] border-r border-rule shadow-xl">
              <PlayerOutline {...outlineProps} onNavigate={() => setOutlineOpen(false)} />
            </div>
          </div>
        )}
        <main id="main" className="min-w-0">{renderMain()}</main>
      </div>
    </div>
  );
}
