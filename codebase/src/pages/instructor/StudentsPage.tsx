import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, UserPlus } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { SearchInput } from "../../components/ui/SearchInput";
import { Pagination, Table, Td, Th } from "../../components/ui/Table";
import { Avatar } from "../../components/ui/Avatar";
import { Badge, CompletionBadge } from "../../components/ui/Badge";
import { ProgressBar } from "../../components/ui/Progress";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { EnrollModal } from "../../components/enrollments/EnrollModal";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { displayName, timeAgo } from "../../lib/format";
import { listEnrollments } from "../../services/enrollments";
import { listAllCourses } from "../../services/courses";

export default function StudentsPage() {
  const { user } = useCurrentUser();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [page, setPage] = useState(1);
  const [enrolling, setEnrolling] = useState(false);
  const courses = useLoader(() => listAllCourses({ teacherId: user.id }), [user.id]);
  const list = useLoader(() => listEnrollments({ teacherId: user.id, courseId: course, search, page }), [user.id, course, search, page]);
  const onSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  return (
    <>
      <PageHeader eyebrow="Teaching" title="Students" description="Learners enrolled in the courses you teach."
        actions={<Button icon={<UserPlus className="size-4" />} onClick={() => setEnrolling(true)} disabled={!courses.data?.length}>Enroll learner</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={search} onChange={onSearch} placeholder="Search learner or course" />
        <Select value={course} onChange={(e) => { setCourse(e.target.value); setPage(1); }} className="w-auto min-w-48" aria-label="Filter by course">
          <option value="">All my courses</option>
          {(courses.data || []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
      </div>

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading && !list.data ? <Loading /> : list.data?.items.length ? (
        <>
          <Table>
            <thead><tr><Th>Learner</Th><Th>Course</Th><Th className="w-44">Progress</Th><Th>Last active</Th><Th>Status</Th></tr></thead>
            <tbody>
              {list.data.items.map((e) => (
                <tr key={e.id} className="hover:bg-paper-2">
                  <Td><span className="flex items-center gap-3"><Avatar user={e.expand?.user} /><span className="font-medium">{displayName(e.expand?.user)}</span></span></Td>
                  <Td><Link to={`/teach/courses/${e.course}?tab=students`} className="hover:underline">{e.expand?.course?.title}</Link></Td>
                  <Td><ProgressBar value={e.progress} showLabel size="sm" /></Td>
                  <Td className="font-mono text-xs text-ink-2">{e.last_accessed ? timeAgo(e.last_accessed) : "never"}</Td>
                  <Td>{e.status === "suspended" ? <Badge tone="danger">Suspended</Badge> : <CompletionBadge status={e.completion_status} />}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.totalItems} onPage={setPage} />
        </>
      ) : <EmptyState icon={<GraduationCap className="size-5" />} title="No students yet" message="Learners appear here once they enroll in one of your courses." />}

      <p className="mt-4 text-xs text-ink-3">To suspend or remove a learner, open the course and go to "Learners & progress".</p>

      <EnrollModal open={enrolling} onClose={() => setEnrolling(false)} onDone={() => { toast("Learner enrolled"); list.reload(); }} />
    </>
  );
}
