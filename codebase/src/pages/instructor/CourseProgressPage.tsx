import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LineChart } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Field";
import { EmptyState, Loading } from "../../components/ui/States";
import { CourseRoster } from "../../components/progress/CourseRoster";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { listAllCourses } from "../../services/courses";

export default function CourseProgressPage() {
  const { user } = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const courses = useLoader(() => listAllCourses({ teacherId: user.id }), [user.id]);
  const [selected, setSelected] = useState(params.get("course") || "");

  useEffect(() => {
    if (!selected && courses.data?.length) setSelected(courses.data[0].id);
  }, [courses.data, selected]);

  const choose = (id: string) => {
    setSelected(id);
    setParams({ course: id }, { replace: true });
  };

  return (
    <>
      <PageHeader eyebrow="Teaching" title="Course progress" description="See who is progressing, who is stuck and which lessons get completed."
        actions={courses.data && courses.data.length > 0 && (
          <Select value={selected} onChange={(e) => choose(e.target.value)} className="w-auto min-w-60" aria-label="Choose course">
            {courses.data.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
        )} />
      {courses.loading ? <Loading /> : !courses.data?.length ? (
        <EmptyState icon={<LineChart className="size-5" />} title="No courses to report on" message="Progress appears here once you teach a course with enrolled learners." />
      ) : selected ? <CourseRoster key={selected} courseId={selected} allowManage={false} /> : null}
    </>
  );
}
