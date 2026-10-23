import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Pause, Play, Trash2, UserPlus, UserCheck } from "lucide-react";
import type { Enrollment } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { SearchInput } from "../../components/ui/SearchInput";
import { Pagination, Table, Td, Th } from "../../components/ui/Table";
import { Badge, CompletionBadge } from "../../components/ui/Badge";
import { ProgressBar } from "../../components/ui/Progress";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EnrollModal } from "../../components/enrollments/EnrollModal";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { displayName, formatDate } from "../../lib/format";
import { deleteEnrollment, listEnrollments, setEnrollmentStatus } from "../../services/enrollments";
import { listAllCourses } from "../../services/courses";

export default function EnrollmentsPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [status, setStatus] = useState("");
  const [completion, setCompletion] = useState("");
  const [page, setPage] = useState(1);
  const [enrolling, setEnrolling] = useState(false);
  const [removing, setRemoving] = useState<Enrollment | null>(null);
  const courses = useLoader(() => listAllCourses(), []);
  const list = useLoader(() => listEnrollments({ search, courseId: course, status, completion, page }), [search, course, status, completion, page]);
  const onSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  const toggle = async (e: Enrollment) => {
    try {
      await setEnrollmentStatus(e.id, e.status === "active" ? "suspended" : "active");
      toast(e.status === "active" ? "Enrollment suspended" : "Enrollment reactivated");
      list.reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Enrollments" description="Who is enrolled where, with live progress."
        actions={<Button icon={<UserPlus className="size-4" />} onClick={() => setEnrolling(true)}>Enroll learner</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={search} onChange={onSearch} placeholder="Search learner or course" />
        <Select value={course} onChange={(e) => { setCourse(e.target.value); setPage(1); }} className="w-auto min-w-48" aria-label="Filter by course">
          <option value="">All courses</option>
          {(courses.data || []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-auto" aria-label="Filter by enrollment status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
        <Select value={completion} onChange={(e) => { setCompletion(e.target.value); setPage(1); }} className="w-auto" aria-label="Filter by completion">
          <option value="">Any completion</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </Select>
      </div>

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading && !list.data ? <Loading /> : list.data?.items.length ? (
        <>
          <Table>
            <thead><tr><Th>Learner</Th><Th>Course</Th><Th className="w-44">Progress</Th><Th>Status</Th><Th>Enrolled</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody>
              {list.data.items.map((e) => (
                <tr key={e.id} className="hover:bg-paper-2">
                  <Td><Link to={`/admin/users/${e.user}`} className="font-medium hover:underline">{displayName(e.expand?.user)}</Link></Td>
                  <Td><Link to={`/admin/courses/${e.course}?tab=students`} className="hover:underline">{e.expand?.course?.title}</Link></Td>
                  <Td><ProgressBar value={e.progress} showLabel size="sm" /></Td>
                  <Td>{e.status === "suspended" ? <Badge tone="danger">Suspended</Badge> : <CompletionBadge status={e.completion_status} />}</Td>
                  <Td className="font-mono text-xs text-ink-2">{formatDate(e.created)} <span className="text-ink-3">· {e.method || "manual"}</span></Td>
                  <Td className="text-right">
                    <div className="inline-flex">
                      <button onClick={() => toggle(e)} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-ink" aria-label={e.status === "active" ? "Suspend" : "Reactivate"} title={e.status === "active" ? "Suspend" : "Reactivate"}>
                        {e.status === "active" ? <Pause className="size-4" /> : <Play className="size-4" />}
                      </button>
                      <button onClick={() => setRemoving(e)} className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-brick" aria-label="Remove enrollment" title="Remove">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.totalItems} onPage={setPage} />
        </>
      ) : <EmptyState icon={<UserCheck className="size-5" />} title="No enrollments found" message="Enroll learners manually, or they can self-enroll in open courses." />}

      <EnrollModal open={enrolling} onClose={() => setEnrolling(false)} onDone={() => { toast("Learner enrolled"); list.reload(); }} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title="Remove enrollment?"
        message={`${displayName(removing?.expand?.user)} will lose access to "${removing?.expand?.course?.title}".`}
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing) return;
          try { await deleteEnrollment(removing.id); toast("Enrollment removed"); list.reload(); }
          catch (err) { toast(errorMessage(err), "error"); }
        }} />
    </>
  );
}
