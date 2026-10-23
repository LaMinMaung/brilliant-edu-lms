import { useState, type FormEvent } from "react";
import type { Course, CourseLevel, CourseStatus } from "../../lib/types";
import { useAuth } from "../../hooks/useAuth";
import { useSettings } from "../../hooks/useSettings";
import { errorMessage } from "../../lib/errors";
import { slugify } from "../../lib/format";
import { createCourse, slugAvailable, updateCourse } from "../../services/courses";
import { fileUrl } from "../../services/files";
import { RichTextEditor } from "../editor/RichTextEditor";
import { FormError } from "../auth/AuthLayout";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea, Toggle } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { CategorySelect } from "./CategorySelect";
import { InstructorPicker } from "./InstructorPicker";
import { ThumbnailInput } from "./ThumbnailInput";

interface Props {
  course?: Course;
  onSaved: (c: Course) => void;
}

export function CourseForm({ course, onSaved }: Props) {
  const { user, can } = useAuth();
  const { settings } = useSettings();
  const isAdmin = can("courses.manage_all");
  const [f, setF] = useState({
    title: course?.title || "",
    slug: course?.slug || "",
    summary: course?.summary || "",
    description: course?.description || "",
    category: course?.category || "",
    level: (course?.level || "") as CourseLevel,
    estimated_hours: course?.estimated_hours ? String(course.estimated_hours) : "",
    status: (course?.status || "draft") as CourseStatus,
    self_enrollment: course ? course.self_enrollment : settings?.default_self_enrollment ?? true,
    instructors: course?.instructors || (user ? [user.id] : []),
  });
  const [slugTouched, setSlugTouched] = useState(!!course);
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const onTitle = (v: string) => setF((p) => ({ ...p, title: v, slug: slugTouched ? p.slug : slugify(v) }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const slug = slugify(f.slug || f.title);
    if (!f.title.trim()) return setError("Title is required.");
    if (!slug) return setError("Please provide a URL slug.");
    setBusy(true);
    try {
      if (!(await slugAvailable(slug, course?.id))) {
        setError(`The slug "${slug}" is already used by another course.`);
        return;
      }
      const fd = new FormData();
      fd.append("title", f.title.trim());
      fd.append("slug", slug);
      fd.append("summary", f.summary.trim());
      fd.append("description", f.description);
      fd.append("category", f.category);
      fd.append("level", f.level);
      fd.append("estimated_hours", f.estimated_hours || "0");
      fd.append("status", f.status);
      fd.append("self_enrollment", String(f.self_enrollment));
      if (file) fd.append("thumbnail", file);
      else if (removed) fd.append("thumbnail", "");
      if (!course) fd.append("owner", user!.id);
      if (isAdmin || !course) {
        if (f.instructors.length) f.instructors.forEach((id) => fd.append("instructors", id));
        else fd.append("instructors", "");
      }
      const saved = course ? await updateCourse(course.id, fd) : await createCourse(fd);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <Panel title="Course information">
          <div className="flex flex-col gap-5">
            <FormError message={error} />
            <Field label="Title" required>{(id) => <Input id={id} value={f.title} onChange={(e) => onTitle(e.target.value)} maxLength={200} />}</Field>
            <Field label="URL slug" hint="Lowercase letters, numbers and dashes.">
              {(id) => (
                <Input id={id} value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} onBlur={() => set("slug", slugify(f.slug))} className="font-mono" />
              )}
            </Field>
            <Field label="Short summary" hint="Shown on course cards (max 400 characters).">
              {(id) => <Textarea id={id} value={f.summary} onChange={(e) => set("summary", e.target.value)} maxLength={400} rows={2} />}
            </Field>
            <Field label="Description">{(id) => <RichTextEditor id={id} value={f.description} onChange={(v) => set("description", v)} placeholder="What will learners get out of this course?" />}</Field>
          </div>
        </Panel>
        <Panel title="Thumbnail">
          <ThumbnailInput
            currentUrl={course?.thumbnail ? fileUrl(course, course.thumbnail, "640x360") : undefined}
            file={file}
            removed={removed}
            onFile={(fl) => { setFile(fl); if (fl) setRemoved(false); }}
            onRemove={() => setRemoved(true)}
            onError={setError}
          />
        </Panel>
      </div>

      <div className="flex flex-col gap-6">
        <Panel title="Publishing">
          <div className="flex flex-col gap-5">
            <Field label="Status" hint="Only published courses appear in the catalog.">
              {(id) => (
                <Select id={id} value={f.status} onChange={(e) => set("status", e.target.value as CourseStatus)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              )}
            </Field>
            <Toggle checked={f.self_enrollment} onChange={(v) => set("self_enrollment", v)} label="Allow self-enrollment" description="Students can join from the catalog." />
          </div>
        </Panel>
        <Panel title="Organisation">
          <div className="flex flex-col gap-5">
            <Field label="Category">{(id) => <CategorySelect id={id} value={f.category} onChange={(e) => set("category", e.target.value)} />}</Field>
            <Field label="Level">
              {(id) => (
                <Select id={id} value={f.level} onChange={(e) => set("level", e.target.value as CourseLevel)}>
                  <option value="">Not specified</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="all_levels">All levels</option>
                </Select>
              )}
            </Field>
            <Field label="Estimated hours">
              {(id) => <Input id={id} type="number" min={0} step="0.5" value={f.estimated_hours} onChange={(e) => set("estimated_hours", e.target.value)} />}
            </Field>
          </div>
        </Panel>
        {isAdmin && (
          <Panel title="Instructors" description="Who can edit and teach this course.">
            <InstructorPicker value={f.instructors} onChange={(v) => set("instructors", v)} ownerId={course?.owner || user?.id} />
          </Panel>
        )}
        <Button type="submit" loading={busy} className="w-full">{course ? "Save changes" : "Create course"}</Button>
      </div>
    </form>
  );
}
