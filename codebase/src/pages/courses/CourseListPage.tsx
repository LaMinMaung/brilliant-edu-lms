import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Plus } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { ButtonLink } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { SearchInput } from "../../components/ui/SearchInput";
import { Pagination, Table, Td, Th } from "../../components/ui/Table";
import { CourseStatusBadge } from "../../components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { CourseCover } from "../../components/courses/CourseCover";
import { CourseCard, CourseGrid } from "../../components/courses/CourseCard";
import { CategorySelect } from "../../components/courses/CategorySelect";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { useManageBase } from "../../hooks/useManageBase";
import { timeAgo } from "../../lib/format";
import type { CourseStatus } from "../../lib/types";
import { listCourses } from "../../services/courses";

export default function CourseListPage() {
  const { user, can } = useCurrentUser();
  const base = useManageBase();
  const adminView = base === "/admin/courses";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CourseStatus | "">("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const courses = useLoader(
    () => listCourses({ search, status, categoryIds: category ? [category] : undefined, teacherId: adminView ? undefined : user.id, page, perPage: adminView ? 20 : 12 }),
    [search, status, category, page, adminView],
  );
  const onSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const canCreate = can("courses.create") || can("courses.manage_all");

  return (
    <>
      <PageHeader
        eyebrow={adminView ? "Administration" : "Teaching"}
        title={adminView ? "Courses" : "My courses"}
        description={adminView ? "Every course on the platform, in any state." : "Courses you own or teach."}
        actions={canCreate && <ButtonLink to={`${base}/new`} icon={<Plus className="size-4" />}>Create course</ButtonLink>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={search} onChange={onSearch} placeholder="Search courses" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as CourseStatus | ""); setPage(1); }} className="w-auto min-w-36" aria-label="Filter by status">
          <option value="">Any status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
        <CategorySelect value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-auto min-w-44" emptyLabel="All categories" aria-label="Filter by category" />
      </div>

      {courses.error ? <ErrorState message={courses.error} onRetry={courses.reload} /> : courses.loading && !courses.data ? <Loading /> : !courses.data?.items.length ? (
        <EmptyState icon={<BookOpen className="size-5" />} title="No courses here yet" message={search || status || category ? "Nothing matches these filters." : "Create a course to start building content."}
          action={canCreate && <ButtonLink to={`${base}/new`} size="sm">Create course</ButtonLink>} />
      ) : adminView ? (
        <Table>
          <thead><tr><Th className="w-[44%]">Course</Th><Th>Category</Th><Th>Instructors</Th><Th>Status</Th><Th>Updated</Th></tr></thead>
          <tbody>
            {courses.data.items.map((c) => (
              <tr key={c.id} className="hover:bg-paper-2">
                <Td>
                  <Link to={`${base}/${c.id}`} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 overflow-hidden rounded border border-rule"><CourseCover course={c} thumb="160x90" className="[&_span]:hidden" /></span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium hover:underline">{c.title}</span>
                      <span className="block truncate font-mono text-[11px] text-ink-3">/{c.slug}</span>
                    </span>
                  </Link>
                </Td>
                <Td className="text-ink-2">{c.expand?.category?.name || "—"}</Td>
                <Td className="max-w-48 truncate text-ink-2">{(c.expand?.instructors || []).map((i) => i.name).join(", ") || "—"}</Td>
                <Td><CourseStatusBadge status={c.status} /></Td>
                <Td className="font-mono text-xs text-ink-2">{timeAgo(c.updated)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <CourseGrid>
          {courses.data.items.map((c) => <CourseCard key={c.id} course={c} to={`${base}/${c.id}`} showStatus />)}
        </CourseGrid>
      )}
      {courses.data && courses.data.items.length > 0 && (
        <Pagination page={courses.data.page} totalPages={courses.data.totalPages} total={courses.data.totalItems} onPage={setPage} />
      )}
    </>
  );
}
