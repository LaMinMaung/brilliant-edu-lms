import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Eye } from "lucide-react";
import type { Activity, CompletionMode } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Field, Input, Select, Textarea, Toggle } from "../../components/ui/Field";
import { ErrorState, Loading } from "../../components/ui/States";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import { MaterialsManager } from "../../components/materials/MaterialsManager";
import { FormError } from "../../components/auth/AuthLayout";
import { useLoader } from "../../hooks/useLoader";
import { useManageBase } from "../../hooks/useManageBase";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { getActivity, updateActivity } from "../../services/curriculum";
import { getCourse } from "../../services/courses";

export default function LessonEditorPage() {
  const { id = "", lessonId = "" } = useParams();
  const base = useManageBase();
  const toast = useToast();
  const data = useLoader(async () => {
    const [course, lesson] = await Promise.all([getCourse(id), getActivity(lessonId)]);
    return { course, lesson };
  }, [id, lessonId]);
  const [f, setF] = useState<Pick<Activity, "title" | "description" | "content" | "completion_mode" | "estimated_minutes" | "is_published"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data.data) return;
    const l = data.data.lesson;
    setF({ title: l.title, description: l.description, content: l.content, completion_mode: l.completion_mode, estimated_minutes: l.estimated_minutes, is_published: l.is_published });
    setDirty(false);
  }, [data.data]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data || !f) return <Loading label="Loading lesson" />;
  const { course, lesson } = data.data;
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF({ ...f, [k]: v }); setDirty(true); };

  const save = async (override?: Partial<typeof f>) => {
    const payload = { ...f, ...override };
    if (!payload.title.trim()) return setError("Title is required.");
    setBusy(true);
    setError(null);
    try {
      const saved = await updateActivity(lesson.id, { ...payload, title: payload.title.trim(), estimated_minutes: Number(payload.estimated_minutes) || 0 });
      data.setData({ course, lesson: saved });
      toast(override?.is_published !== undefined ? (override.is_published ? "Lesson saved & published" : "Lesson saved as draft") : "Lesson saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Courses", to: base }, { label: course.title, to: `${base}/${course.id}?tab=curriculum` }, { label: lesson.title }]}
        eyebrow="Lesson"
        title={lesson.title}
        description={<span className="flex items-center gap-2"><Badge tone={lesson.is_published ? "success" : "warning"}>{lesson.is_published ? "Published" : "Draft"}</Badge>{dirty && <span className="text-xs text-marker-deep">Unsaved changes</span>}</span>}
        actions={
          <>
            <ButtonLink to={`/learn/courses/${course.id}/play/${lesson.id}`} variant="secondary" size="sm" icon={<Eye className="size-4" />}>Preview</ButtonLink>
            <Button variant="secondary" size="sm" onClick={() => save()} loading={busy} disabled={!dirty}>Save</Button>
            {!lesson.is_published
              ? <Button variant="marker" size="sm" onClick={() => save({ is_published: true })} loading={busy}>Save & publish</Button>
              : <Button variant="ghost" size="sm" onClick={() => save({ is_published: false })} loading={busy}>Unpublish</Button>}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Panel title="Content">
            <div className="flex flex-col gap-5">
              <FormError message={error} />
              <Field label="Title" required>{(fid) => <Input id={fid} value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />}</Field>
              <Field label="Short description" hint="Shown beneath the lesson title.">
                {(fid) => <Textarea id={fid} value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={1000} />}
              </Field>
              <Field label="Lesson content">{(fid) => <RichTextEditor id={fid} value={f.content} onChange={(v) => set("content", v)} placeholder="Write the lesson: explanations, examples, steps…" />}</Field>
            </div>
          </Panel>
          <MaterialsManager courseId={course.id} activityId={lesson.id} />
        </div>
        <div className="flex flex-col gap-6">
          <Panel title="Settings">
            <div className="flex flex-col gap-5">
              <Toggle checked={f.is_published} onChange={(v) => set("is_published", v)} label="Published" description="Visible to enrolled learners when its section is visible." />
              <Field label="Completion" hint="How this lesson counts toward progress.">
                {(fid) => (
                  <Select id={fid} value={f.completion_mode} onChange={(e) => set("completion_mode", e.target.value as CompletionMode)}>
                    <option value="manual">Student marks it complete</option>
                    <option value="view">Complete when opened</option>
                    <option value="none">Not tracked</option>
                  </Select>
                )}
              </Field>
              <Field label="Estimated minutes">
                {(fid) => <Input id={fid} type="number" min={0} value={f.estimated_minutes || ""} onChange={(e) => set("estimated_minutes", Number(e.target.value))} />}
              </Field>
              <Button onClick={() => save()} loading={busy} disabled={!dirty}>Save lesson</Button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
