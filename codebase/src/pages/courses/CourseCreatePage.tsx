import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { CourseForm } from "../../components/courses/CourseForm";
import { useManageBase } from "../../hooks/useManageBase";
import { useToast } from "../../hooks/useToast";

export default function CourseCreatePage() {
  const base = useManageBase();
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <>
      <PageHeader crumbs={[{ label: "Courses", to: base }, { label: "New course" }]} title="Create a course" description="Start with the essentials. You'll add sections and lessons next." />
      <CourseForm
        onSaved={(c) => {
          toast("Course created. Now add your first section.");
          navigate(`${base}/${c.id}?tab=curriculum`);
        }}
      />
    </>
  );
}
