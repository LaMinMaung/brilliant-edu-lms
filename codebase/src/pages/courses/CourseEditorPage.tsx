import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Tabs } from "../../components/ui/Tabs";
import { Button, ButtonLink } from "../../components/ui/Button";
import { CourseStatusBadge } from "../../components/ui/Badge";
import { ErrorState, Loading } from "../../components/ui/States";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { CourseForm } from "../../components/courses/CourseForm";
import { CurriculumManager } from "../../components/curriculum/CurriculumManager";
import { CourseRoster } from "../../components/progress/CourseRoster";
import { GradebookPanel } from "../../components/grades/GradebookPanel";
import { QuestionBank } from "../../components/quiz/QuestionBank";
import { AnnouncementsPanel } from "../../components/community/AnnouncementsPanel";
import { DiscussionBoard } from "../../components/community/DiscussionBoard";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { useManageBase } from "../../hooks/useManageBase";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { deleteCourse, getCourse, updateCourse } from "../../services/courses";

type Tab = "details" | "curriculum" | "students" | "bank" | "gradebook" | "announcements" | "discussions";

export default function CourseEditorPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "curriculum";
  const base = useManageBase();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, can } = useCurrentUser();
  const course = useLoader(() => getCourse(id), [id]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  if (course.error) return <ErrorState message={course.error} onRetry={course.reload} />;
  if (!course.data) return <Loading label="Loading course" />;
  const c = course.data;
  const canDelete = can("courses.manage_all") || (c.owner === user.id && c.status !== "published");

  const setStatus = async (status: "draft" | "published") => {
    setBusy(true);
    try {
      course.setData(await updateCourse(c.id, { status }));
      toast(status === "published" ? "Course published" : "Course moved to draft");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Courses", to: base }, { label: c.title }]}
        eyebrow={c.expand?.category?.name || "Course"}
        title={c.title}
        description={<span className="flex items-center gap-2"><CourseStatusBadge status={c.status} /> <span className="font-mono text-xs text-ink-3">/{c.slug}</span></span>}
        actions={
          <>
            <ButtonLink to={`/learn/courses/${c.id}/play`} variant="secondary" size="sm" icon={<Eye className="size-4" />}>Preview</ButtonLink>
            {c.status === "published" ? (
              <Button variant="secondary" size="sm" onClick={() => setStatus("draft")} loading={busy}>Unpublish</Button>
            ) : (
              <Button variant="marker" size="sm" onClick={() => setStatus("published")} loading={busy}>Publish</Button>
            )}
            {canDelete && <Button variant="ghost" size="sm" aria-label="Delete course" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)} />}
          </>
        }
      />
      <Tabs<Tab>
        tabs={[
          { key: "curriculum", label: "Curriculum" },
          { key: "details", label: "Details" },
          { key: "students", label: "Learners & progress" },
          { key: "gradebook", label: "Gradebook" },
          { key: "bank", label: "Question bank" },
          { key: "announcements", label: "Announcements" },
          { key: "discussions", label: "Discussions" },
        ]}
        active={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
      />
      {tab === "details" && <CourseForm key={c.updated} course={c} onSaved={(saved) => { course.setData(saved); toast("Course saved"); }} />}
      {tab === "curriculum" && <CurriculumManager courseId={c.id} base={base} />}
      {tab === "students" && <CourseRoster courseId={c.id} />}
      {tab === "gradebook" && <GradebookPanel courseId={c.id} />}
      {tab === "bank" && <QuestionBank courseId={c.id} />}
      {tab === "announcements" && <AnnouncementsPanel courseId={c.id} canManage />}
      {tab === "discussions" && (
        <DiscussionBoard courseId={c.id} canModerate topicId={params.get("topic") || undefined}
          topicHref={(t) => `${base}/${c.id}?tab=discussions&topic=${t}`} listHref={`${base}/${c.id}?tab=discussions`} />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this course?"
        message="All sections, lessons, files, enrollments and learner progress for this course will be permanently deleted. To keep history, archive it instead."
        confirmLabel="Delete course"
        onConfirm={async () => {
          try { await deleteCourse(c.id); toast("Course deleted"); navigate(base); }
          catch (err) { toast(errorMessage(err), "error"); }
        }}
      />
    </>
  );
}
