import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Layers } from "lucide-react";
import type { Section } from "../../lib/types";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import {
  deleteActivity, deleteSection, groupCurriculum, listActivities, listSections, reorder, updateActivity, updateSection,
} from "../../services/curriculum";
import { Button } from "../ui/Button";
import { EmptyState, ErrorState, Loading } from "../ui/States";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { SectionModal } from "./SectionModal";
import { ActivityCreateModal } from "./ActivityCreateModal";
import { SectionBlock } from "./SectionBlock";

type Pending = { kind: "section" | "lesson"; id: string; title: string } | null;

export function CurriculumManager({ courseId, base }: { courseId: string; base: string }) {
  const toast = useToast();
  const navigate = useNavigate();
  const data = useLoader(async () => {
    const [s, a] = await Promise.all([listSections(courseId), listActivities(courseId)]);
    return groupCurriculum(s, a);
  }, [courseId]);
  const [editing, setEditing] = useState<Section | null | "new">(null);
  const [lessonFor, setLessonFor] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast(ok);
      await data.reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading label="Loading curriculum" />;
  const sections = data.data;

  const moveSection = (idx: number, dir: -1 | 1) => {
    const ids = sections.map((s) => s.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    run(() => reorder("sections", ids));
  };

  const moveLesson = (sectionIdx: number, idx: number, dir: -1 | 1) => {
    const ids = sections[sectionIdx].activities.map((a) => a.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    run(() => reorder("activities", ids));
  };

  const totalLessons = sections.reduce((n, s) => n + s.activities.length, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-3">
          {sections.length} section{sections.length === 1 ? "" : "s"} · {totalLessons} activit{totalLessons === 1 ? "y" : "ies"}
        </p>
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>Add section</Button>
      </div>

      {sections.length === 0 ? (
        <EmptyState icon={<Layers className="size-5" />} title="No sections yet" message="Sections hold your lessons. Start with an introduction or a first week."
          action={<Button size="sm" onClick={() => setEditing("new")}>Add the first section</Button>} />
      ) : (
        <ol className="flex flex-col gap-4">
          {sections.map((s, si) => (
            <SectionBlock
              key={s.id}
              section={s}
              index={si}
              isFirst={si === 0}
              isLast={si === sections.length - 1}
              base={base}
              onMove={(dir) => moveSection(si, dir)}
              onEdit={() => setEditing(s)}
              onTogglePublish={() => run(() => updateSection(s.id, { is_published: !s.is_published }), s.is_published ? "Section hidden" : "Section visible")}
              onDelete={() => setPending({ kind: "section", id: s.id, title: s.title })}
              onAddLesson={() => setLessonFor(s.id)}
              onMoveLesson={(li, dir) => moveLesson(si, li, dir)}
              onToggleLesson={(a) => run(() => updateActivity(a.id, { is_published: !a.is_published }), a.is_published ? "Activity unpublished" : "Activity published")}
              onDeleteLesson={(a) => setPending({ kind: "lesson", id: a.id, title: a.title })}
            />
          ))}
        </ol>
      )}

      <SectionModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        courseId={courseId}
        section={editing === "new" ? null : editing}
        nextOrder={sections.length}
        onSaved={() => { toast("Section saved"); data.reload(); }}
      />
      <ActivityCreateModal
        open={!!lessonFor}
        onClose={() => setLessonFor(null)}
        courseId={courseId}
        sectionId={lessonFor || ""}
        nextOrder={sections.find((s) => s.id === lessonFor)?.activities.length || 0}
        onCreated={(id) => navigate(`${base}/${courseId}/lessons/${id}`)}
      />
      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.kind === "section" ? "Delete section?" : "Delete activity?"}
        message={
          pending?.kind === "section"
            ? `"${pending?.title}" and all of its activities, files, quiz attempts, submissions and learner progress will be permanently deleted.`
            : `"${pending?.title}" and its files, quiz attempts, submissions, grades and learner progress will be permanently deleted.`
        }
        confirmLabel="Delete"
        onConfirm={() => pending && run(() => (pending.kind === "section" ? deleteSection(pending.id) : deleteActivity(pending.id)), "Deleted")}
      />
    </div>
  );
}
