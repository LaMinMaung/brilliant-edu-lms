import { useEffect, useState } from "react";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { errorMessage } from "../../lib/errors";
import { listAllCourses } from "../../services/courses";
import { enrollUser } from "../../services/enrollments";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Select } from "../ui/Field";
import { FormError } from "../auth/AuthLayout";
import { UserPicker, type PickedUser } from "./UserPicker";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  /** Fixed course (pick a user) */
  courseId?: string;
  /** Fixed user (pick a course) */
  userId?: string;
  excludeUserIds?: string[];
  excludeCourseIds?: string[];
}

export function EnrollModal({ open, onClose, onDone, courseId, userId, excludeUserIds = [], excludeCourseIds = [] }: Props) {
  const { user, can } = useCurrentUser();
  const [picked, setPicked] = useState<PickedUser | null>(null);
  const [course, setCourse] = useState(courseId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const courses = useLoader(
    () => (open && !courseId ? listAllCourses(can("courses.manage_all") || can("enrollments.manage_all") ? {} : { teacherId: user.id }) : Promise.resolve([])),
    [open, courseId],
  );

  useEffect(() => {
    if (open) { setPicked(null); setCourse(courseId || ""); setError(null); }
  }, [open, courseId]);

  const targetUser = userId || picked?.id;
  const submit = async () => {
    if (!targetUser || !course) return;
    setBusy(true);
    setError(null);
    try {
      await enrollUser(targetUser, course, user.id);
      onDone();
      onClose();
    } catch (err) {
      const msg = errorMessage(err);
      setError(/unique|already/i.test(msg) ? "This user is already enrolled in that course." : msg);
    } finally {
      setBusy(false);
    }
  };

  const available = (courses.data || []).filter((c) => !excludeCourseIds.includes(c.id));

  return (
    <Modal open={open} onClose={onClose} title="Enroll a learner" description="Manual enrollments are active immediately."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy} disabled={!targetUser || !course}>Enroll</Button></>}>
      <div className="flex flex-col gap-4">
        <FormError message={error} />
        {!userId && <Field label="Learner">{() => <UserPicker value={picked} onChange={setPicked} excludeIds={excludeUserIds} />}</Field>}
        {!courseId && (
          <Field label="Course">
            {(id) => (
              <Select id={id} value={course} onChange={(e) => setCourse(e.target.value)}>
                <option value="">{courses.loading ? "Loading courses…" : "Select a course"}</option>
                {available.map((c) => <option key={c.id} value={c.id}>{c.title} {c.status !== "published" ? `(${c.status})` : ""}</option>)}
              </Select>
            )}
          </Field>
        )}
      </div>
    </Modal>
  );
}
