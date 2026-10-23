import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Clock, Layers, Lock, Signal } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { ProgressBar } from "../../components/ui/Progress";
import { ErrorState, Loading } from "../../components/ui/States";
import { CourseCover } from "../../components/courses/CourseCover";
import { RichText } from "../../components/editor/RichText";
import { playerPath } from "../../components/learning/ContinueCard";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { useSettings } from "../../hooks/useSettings";
import { errorMessage } from "../../lib/errors";
import { LEVEL_LABEL, displayName } from "../../lib/format";
import { getCourse } from "../../services/courses";
import { listSections } from "../../services/curriculum";
import { getEnrollment, selfEnroll } from "../../services/enrollments";

export default function CourseDetailPage() {
  const { id = "" } = useParams();
  const { user, can } = useCurrentUser();
  const { selfEnrollmentEnabled } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const data = useLoader(async () => {
    const [course, sections, enrollment] = await Promise.all([getCourse(id), listSections(id), getEnrollment(user.id, id)]);
    return { course, sections: sections.filter((s) => s.is_published), enrollment };
  }, [id, user.id]);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading />;
  const { course: c, sections, enrollment } = data.data;
  const instructors = c.expand?.instructors || [];

  const enroll = async () => {
    setBusy(true);
    try {
      await selfEnroll(user.id, c.id);
      toast(`You're enrolled in ${c.title}`);
      navigate(`/learn/courses/${c.id}/play`);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const action = enrollment ? (
    enrollment.status === "active" ? (
      <div className="flex flex-col gap-3">
        <ProgressBar value={enrollment.progress} showLabel />
        <ButtonLink to={playerPath(enrollment)} icon={<ArrowRight className="size-4" />} className="w-full">{enrollment.progress > 0 ? "Continue course" : "Start course"}</ButtonLink>
      </div>
    ) : <p className="rounded-md bg-brick-soft px-3 py-2 text-sm text-brick">Your access to this course is suspended. Contact your instructor.</p>
  ) : c.status !== "published" ? (
    <p className="text-sm text-ink-2">This course is not open for enrollment.</p>
  ) : c.self_enrollment && selfEnrollmentEnabled && can("courses.enroll") ? (
    <Button onClick={enroll} loading={busy} variant="marker" className="w-full">Enroll in this course</Button>
  ) : (
    <p className="flex items-start gap-2 text-sm text-ink-2"><Lock className="mt-0.5 size-4 shrink-0" aria-hidden /> Enrollment is by invitation. An instructor or administrator can enroll you.</p>
  );

  return (
    <>
      <PageHeader crumbs={[{ label: "Course catalog", to: "/learn/catalog" }, ...(c.expand?.category ? [{ label: c.expand.category.name }] : []), { label: c.title }]} title={c.title} description={c.summary} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          {c.description && <Panel title="About this course"><RichText html={c.description} /></Panel>}
          <Panel title="Course outline" description={`${sections.length} section${sections.length === 1 ? "" : "s"}`}>
            {sections.length ? (
              <ol className="flex flex-col">
                {sections.map((s, i) => (
                  <li key={s.id} className="flex gap-4 border-b border-rule py-3 last:border-0">
                    <span className="font-mono text-xs text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="font-medium">{s.title}</p>
                      {s.summary && <p className="mt-0.5 text-sm text-ink-2">{s.summary}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-ink-3">The outline will appear once content is published.</p>}
          </Panel>
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-lg border border-rule bg-paper">
            <CourseCover course={c} className="border-b border-rule" />
            <div className="flex flex-col gap-4 p-5">
              <ul className="flex flex-col gap-2 text-sm text-ink-2">
                {c.level && <li className="flex items-center gap-2"><Signal className="size-4" aria-hidden /> {LEVEL_LABEL[c.level]}</li>}
                {c.estimated_hours > 0 && <li className="flex items-center gap-2"><Clock className="size-4" aria-hidden /> About {c.estimated_hours} hour{c.estimated_hours === 1 ? "" : "s"}</li>}
                <li className="flex items-center gap-2"><Layers className="size-4" aria-hidden /> {sections.length} sections</li>
              </ul>
              {action}
            </div>
          </div>
          {instructors.length > 0 && (
            <Panel title={instructors.length > 1 ? "Instructors" : "Instructor"}>
              <ul className="flex flex-col gap-4">
                {instructors.map((i) => (
                  <li key={i.id} className="flex items-start gap-3">
                    <Avatar user={i} size="md" />
                    <div className="min-w-0">
                      <p className="font-medium">{displayName(i)}</p>
                      {i.headline && <p className="text-sm text-ink-2">{i.headline}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}
