import { useCallback, useState } from "react";
import { Compass } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Field";
import { SearchInput } from "../../components/ui/SearchInput";
import { Pagination } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { CourseCard, CourseGrid } from "../../components/courses/CourseCard";
import { CategorySelect } from "../../components/courses/CategorySelect";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { useSettings } from "../../hooks/useSettings";
import { listCourses } from "../../services/courses";
import { descendantIds, listCategories } from "../../services/categories";
import { myEnrollments } from "../../services/enrollments";

export default function CatalogPage() {
  const { user } = useCurrentUser();
  const { selfEnrollmentEnabled } = useSettings();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [page, setPage] = useState(1);
  const cats = useLoader(listCategories, []);
  const enrolled = useLoader(() => myEnrollments(user.id), [user.id]);
  const list = useLoader(() => {
    const categoryIds = category ? descendantIds(cats.data || [], category) : undefined;
    return listCourses({ status: "published", search, categoryIds, level, page, perPage: 12, sort: "title" });
  }, [search, category, level, page, cats.data]);
  const onSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const enrolledIds = new Set((enrolled.data || []).map((e) => e.course));

  return (
    <>
      <PageHeader eyebrow="Learning" title="Course catalog" description="Published courses open to learners. Some allow you to enroll yourself." />
      <div className="mb-6 flex flex-wrap gap-2">
        <SearchInput value={search} onChange={onSearch} placeholder="Search courses" />
        <CategorySelect value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-auto min-w-48" emptyLabel="All categories" aria-label="Filter by category" />
        <Select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} className="w-auto min-w-36" aria-label="Filter by level">
          <option value="">Any level</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="all_levels">All levels</option>
        </Select>
      </div>
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading && !list.data ? <Loading /> : list.data?.items.length ? (
        <>
          <CourseGrid>
            {list.data.items.map((c) => (
              <CourseCard key={c.id} course={c} to={`/learn/catalog/${c.id}`}
                footer={<div className="mt-3 flex gap-2">{enrolledIds.has(c.id) ? <Badge tone="success">Enrolled</Badge> : c.self_enrollment && selfEnrollmentEnabled ? <Badge tone="marker">Open enrollment</Badge> : <Badge>By invitation</Badge>}</div>} />
            ))}
          </CourseGrid>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.totalItems} onPage={setPage} />
        </>
      ) : <EmptyState icon={<Compass className="size-5" />} title="No courses found" message={search || category || level ? "Try different filters." : "No courses have been published yet."} />}
    </>
  );
}
