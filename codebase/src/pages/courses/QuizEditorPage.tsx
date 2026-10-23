import { useParams, useSearchParams } from "react-router-dom";
import { Eye } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Tabs } from "../../components/ui/Tabs";
import { ButtonLink } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ErrorState, Loading } from "../../components/ui/States";
import { ActivityBasicsForm } from "../../components/activities/ActivityBasicsForm";
import { QuizSettingsForm } from "../../components/quiz/QuizSettingsForm";
import { QuizQuestionsManager } from "../../components/quiz/QuizQuestionsManager";
import { QuizAttemptsPanel } from "../../components/quiz/QuizAttemptsPanel";
import { useLoader } from "../../hooks/useLoader";
import { useManageBase } from "../../hooks/useManageBase";
import { getActivity } from "../../services/curriculum";
import { getCourse } from "../../services/courses";
import { getQuizByActivity } from "../../services/quizzes";

type Tab = "setup" | "questions" | "attempts";

export default function QuizEditorPage() {
  const { id = "", lessonId = "" } = useParams();
  const base = useManageBase();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "setup";
  const data = useLoader(async () => {
    const [course, activity, quiz] = await Promise.all([getCourse(id), getActivity(lessonId), getQuizByActivity(lessonId)]);
    return { course, activity, quiz };
  }, [id, lessonId]);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading label="Loading quiz" />;
  const { course, activity, quiz } = data.data;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Courses", to: base }, { label: course.title, to: `${base}/${course.id}?tab=curriculum` }, { label: activity.title }]}
        eyebrow="Quiz"
        title={activity.title}
        description={<span className="flex items-center gap-2"><Badge tone={activity.is_published ? "success" : "warning"}>{activity.is_published ? "Published" : "Draft"}</Badge></span>}
        actions={<ButtonLink to={`/learn/courses/${course.id}/play/${activity.id}`} variant="secondary" size="sm" icon={<Eye className="size-4" />}>Preview</ButtonLink>}
      />
      <Tabs<Tab> tabs={[{ key: "setup", label: "Setup" }, { key: "questions", label: "Questions" }, { key: "attempts", label: "Attempts & grading" }]} active={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} />
      {tab === "setup" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <ActivityBasicsForm activity={activity} instructionsLabel="Instructions shown before starting" onSaved={(a) => data.setData({ course, quiz, activity: a })} />
          <QuizSettingsForm quiz={quiz} onSaved={(q) => data.setData({ course, activity, quiz: q })} />
        </div>
      )}
      {tab === "questions" && <QuizQuestionsManager quiz={quiz} />}
      {tab === "attempts" && <QuizAttemptsPanel quiz={quiz} />}
    </>
  );
}
