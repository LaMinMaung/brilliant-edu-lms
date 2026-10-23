import { useParams, useSearchParams } from "react-router-dom";
import { Eye } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Tabs } from "../../components/ui/Tabs";
import { ButtonLink } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ErrorState, Loading } from "../../components/ui/States";
import { ActivityBasicsForm } from "../../components/activities/ActivityBasicsForm";
import { AssignmentSettingsForm } from "../../components/assignment/AssignmentSettingsForm";
import { SubmissionsPanel } from "../../components/assignment/SubmissionsPanel";
import { MaterialsManager } from "../../components/materials/MaterialsManager";
import { useLoader } from "../../hooks/useLoader";
import { useManageBase } from "../../hooks/useManageBase";
import { dueLabel } from "../../lib/format";
import { getActivity } from "../../services/curriculum";
import { getCourse } from "../../services/courses";
import { getAssignmentByActivity } from "../../services/assignments";

type Tab = "setup" | "submissions";

export default function AssignmentEditorPage() {
  const { id = "", lessonId = "" } = useParams();
  const base = useManageBase();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "setup";
  const data = useLoader(async () => {
    const [course, activity, assignment] = await Promise.all([getCourse(id), getActivity(lessonId), getAssignmentByActivity(lessonId)]);
    return { course, activity, assignment };
  }, [id, lessonId]);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading label="Loading assignment" />;
  const { course, activity, assignment } = data.data;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Courses", to: base }, { label: course.title, to: `${base}/${course.id}?tab=curriculum` }, { label: activity.title }]}
        eyebrow="Assignment"
        title={activity.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={activity.is_published ? "success" : "warning"}>{activity.is_published ? "Published" : "Draft"}</Badge>
            <span className="text-sm text-ink-3">{dueLabel(assignment.due_at)} · {assignment.max_marks} marks</span>
          </span>
        }
        actions={<ButtonLink to={`/learn/courses/${course.id}/play/${activity.id}`} variant="secondary" size="sm" icon={<Eye className="size-4" />}>Preview</ButtonLink>}
      />
      <Tabs<Tab> tabs={[{ key: "setup", label: "Setup" }, { key: "submissions", label: "Submissions & grading" }]} active={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} />
      {tab === "setup" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <ActivityBasicsForm activity={activity} instructionsLabel="Instructions" onSaved={(a) => data.setData({ course, assignment, activity: a })} />
          <div className="flex flex-col gap-6">
            <AssignmentSettingsForm assignment={assignment} onSaved={(a) => data.setData({ course, activity, assignment: a })} />
            <MaterialsManager courseId={course.id} activityId={activity.id} />
          </div>
        </div>
      ) : (
        <SubmissionsPanel assignment={assignment} />
      )}
    </>
  );
}
