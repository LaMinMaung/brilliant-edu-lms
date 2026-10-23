import { useState } from "react";
import { Library } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Tabs } from "../../components/ui/Tabs";
import { ButtonLink } from "../../components/ui/Button";
import { Badge, CompletionBadge } from "../../components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { CourseCard, CourseGrid } from "../../components/courses/CourseCard";
import { playerPath } from "../../components/learning/ContinueCard";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { myEnrollments } from "../../services/enrollments";

type Tab = "all" | "in_progress" | "completed";

export default function MyCoursesPage() {
  const { user } = useCurrentUser();
  const [tab, setTab] = useState<Tab>("all");
  const data = useLoader(() => myEnrollments(user.id), [user.id]);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading />;
  const all = data.data.filter((e) => e.expand?.course);
  const inProgress = all.filter((e) => e.completion_status !== "completed");
  const completed = all.filter((e) => e.completion_status === "completed");
  const shown = tab === "all" ? all : tab === "completed" ? completed : inProgress;

  return (
    <>
      <PageHeader eyebrow="Learning" title="My courses" description="Everything you're enrolled in." actions={<ButtonLink to="/learn/catalog" variant="secondary" size="sm">Browse catalog</ButtonLink>} />
      <Tabs<Tab> tabs={[{ key: "all", label: "All", count: all.length }, { key: "in_progress", label: "In progress", count: inProgress.length }, { key: "completed", label: "Completed", count: completed.length }]} active={tab} onChange={setTab} />
      {shown.length ? (
        <CourseGrid>
          {shown.map((e) => (
            <CourseCard
              key={e.id}
              course={e.expand!.course!}
              to={e.status === "active" ? playerPath(e) : `/learn/catalog/${e.course}`}
              progress={e.progress}
              footer={
                <div className="mt-3 flex items-center justify-between">
                  {e.status === "suspended" ? <Badge tone="danger">Access suspended</Badge> : <CompletionBadge status={e.completion_status} />}
                  <span className="font-mono text-[11px] text-ink-3">{e.completed_count || 0}/{e.total_count || 0} lessons</span>
                </div>
              }
            />
          ))}
        </CourseGrid>
      ) : (
        <EmptyState icon={<Library className="size-5" />} title={tab === "completed" ? "No completed courses yet" : "No courses here"}
          message={tab === "completed" ? "Finish every lesson in a course to complete it." : "Enroll in a course from the catalog to get started."}
          action={<ButtonLink to="/learn/catalog" size="sm">Browse catalog</ButtonLink>} />
      )}
    </>
  );
}
