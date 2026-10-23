import { useState } from "react";
import { Link } from "react-router-dom";
import { Pause, Play, Trash2, UserPlus, Users } from "lucide-react";
import type { Enrollment } from "../../lib/types";
import { useAuth } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { displayName, timeAgo } from "../../lib/format";
import { deleteEnrollment, listAllEnrollments, setEnrollmentStatus } from "../../services/enrollments";
import { listActivities } from "../../services/curriculum";
import { listCourseProgress } from "../../services/progress";
import { Avatar } from "../ui/Avatar";
import { Badge, CompletionBadge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/Progress";
import { Panel } from "../ui/Panel";
import { StatCard } from "../ui/StatCard";
import { Table, Td, Th } from "../ui/Table";
import { EmptyState, ErrorState, Loading } from "../ui/States";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EnrollModal } from "../enrollments/EnrollModal";
import { LessonBreakdown } from "./LessonBreakdown";

export function CourseRoster({ courseId, allowManage = true }: { courseId: string; allowManage?: boolean }) {
  const toast = useToast();
  const { can } = useAuth();
  const [enrolling, setEnrolling] = useState(false);
  const [removing, setRemoving] = useState<Enrollment | null>(null);
  const data = useLoader(async () => {
    const [enrollments, activities, progress] = await Promise.all([listAllEnrollments({ courseId }), listActivities(courseId), listCourseProgress(courseId)]);
    return { enrollments, activities, progress };
  }, [courseId]);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading label="Loading learners" />;
  const { enrollments, activities, progress } = data.data;
  const active = enrollments.filter((e) => e.status === "active");
  const avg = active.length ? Math.round(active.reduce((n, e) => n + (e.progress || 0), 0) / active.length) : 0;
  const completed = enrollments.filter((e) => e.completion_status === "completed").length;

  const toggle = async (e: Enrollment) => {
    try {
      await setEnrollmentStatus(e.id, e.status === "active" ? "suspended" : "active");
      toast(e.status === "active" ? "Enrollment suspended" : "Enrollment reactivated");
      data.reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  const userLink = (e: Enrollment) => (can("users.manage") ? `/admin/users/${e.user}` : undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Enrolled" value={enrollments.length} emphasis />
        <StatCard label="Active" value={active.length} />
        <StatCard label="Avg. progress" value={`${avg}%`} />
        <StatCard label="Completed" value={completed} />
      </div>

      <Panel title="Learners" bodyClassName="p-0 sm:p-0"
        actions={allowManage && <Button size="sm" icon={<UserPlus className="size-4" />} onClick={() => setEnrolling(true)}>Enroll learner</Button>}>
        {enrollments.length === 0 ? (
          <div className="p-5"><EmptyState icon={<Users className="size-5" />} title="No learners yet" message="Enroll learners manually, or allow self-enrollment and publish the course." /></div>
        ) : (
          <div className="-m-px">
            <Table>
              <thead><tr><Th>Learner</Th><Th className="w-48">Progress</Th><Th>Lessons</Th><Th>Last active</Th><Th>Status</Th>{allowManage && <Th className="text-right">Actions</Th>}</tr></thead>
              <tbody>
                {enrollments.map((e) => {
                  const href = userLink(e);
                  const nameEl = <span className="block truncate font-medium">{displayName(e.expand?.user)}</span>;
                  return (
                    <tr key={e.id} className="hover:bg-paper-2">
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar user={e.expand?.user} />
                          <div className="min-w-0">
                            {href ? <Link to={href} className="hover:underline">{nameEl}</Link> : nameEl}
                            <span className="block text-xs text-ink-3">{e.method === "self" ? "Self-enrolled" : "Added manually"}</span>
                          </div>
                        </div>
                      </Td>
                      <Td><ProgressBar value={e.progress} showLabel size="sm" /></Td>
                      <Td className="font-mono text-xs">{e.completed_count || 0}/{e.total_count || 0}</Td>
                      <Td className="font-mono text-xs text-ink-2">{e.last_accessed ? timeAgo(e.last_accessed) : "never"}</Td>
                      <Td>{e.status === "suspended" ? <Badge tone="danger">Suspended</Badge> : <CompletionBadge status={e.completion_status} />}</Td>
                      {allowManage && (
                        <Td className="text-right">
                          <div className="inline-flex">
                            <button onClick={() => toggle(e)} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-ink" aria-label={e.status === "active" ? "Suspend enrollment" : "Reactivate enrollment"} title={e.status === "active" ? "Suspend" : "Reactivate"}>
                              {e.status === "active" ? <Pause className="size-4" /> : <Play className="size-4" />}
                            </button>
                            <button onClick={() => setRemoving(e)} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-brick" aria-label="Remove enrollment" title="Remove">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </Td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Panel>

      <Panel title="Lesson completion" description="How many active learners finished each tracked lesson.">
        <LessonBreakdown activities={activities} progress={progress} enrollments={active} />
      </Panel>

      <EnrollModal open={enrolling} onClose={() => setEnrolling(false)} courseId={courseId} excludeUserIds={enrollments.map((e) => e.user)}
        onDone={() => { toast("Learner enrolled"); data.reload(); }} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title="Remove this learner?"
        message={`${displayName(removing?.expand?.user)} will lose access to the course. Their lesson progress records are kept and restored if re-enrolled.`}
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing) return;
          try { await deleteEnrollment(removing.id); toast("Enrollment removed"); data.reload(); }
          catch (err) { toast(errorMessage(err), "error"); }
        }} />
    </div>
  );
}
