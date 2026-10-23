import pb from "../lib/pocketbase";
import type { Enrollment } from "../lib/types";

const col = () => pb.collection("enrollments");

export interface EnrollmentFilters {
  courseId?: string;
  userId?: string;
  teacherId?: string;
  status?: string;
  completion?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

function buildFilter({ courseId, userId, teacherId, status, completion, search }: EnrollmentFilters) {
  const parts: string[] = [];
  if (courseId) parts.push(pb.filter("course = {:c}", { c: courseId }));
  if (userId) parts.push(pb.filter("user = {:u}", { u: userId }));
  if (teacherId) parts.push(pb.filter("(course.owner = {:t} || course.instructors.id ?= {:t})", { t: teacherId }));
  if (status) parts.push(pb.filter("status = {:s}", { s: status }));
  if (completion) parts.push(pb.filter("completion_status = {:cs}", { cs: completion }));
  if (search) parts.push(pb.filter("(user.name ~ {:q} || user.email ~ {:q} || course.title ~ {:q})", { q: search }));
  return parts.join(" && ");
}

export function listEnrollments(filters: EnrollmentFilters = {}) {
  const { page = 1, perPage = 25 } = filters;
  return col().getList<Enrollment>(page, perPage, {
    filter: buildFilter(filters),
    sort: "-created",
    expand: "user,course",
    requestKey: null,
  });
}

export function listAllEnrollments(filters: EnrollmentFilters = {}, sort = "-created") {
  return col().getFullList<Enrollment>({
    filter: buildFilter(filters),
    sort,
    expand: "user,course,course.category,last_activity",
    requestKey: null,
  });
}

export function myEnrollments(userId: string) {
  return listAllEnrollments({ userId }, "-last_accessed,-created");
}

export async function getEnrollment(userId: string, courseId: string) {
  const res = await col().getList<Enrollment>(1, 1, {
    filter: pb.filter("user = {:u} && course = {:c}", { u: userId, c: courseId }),
    requestKey: null,
  });
  return res.items[0] || null;
}

export function enrollUser(userId: string, courseId: string, enrolledBy: string) {
  return col().create<Enrollment>({ user: userId, course: courseId, status: "active", method: "manual", enrolled_by: enrolledBy });
}

export function selfEnroll(userId: string, courseId: string) {
  return col().create<Enrollment>({ user: userId, course: courseId, status: "active", method: "self" });
}

export const setEnrollmentStatus = (id: string, status: "active" | "suspended") => col().update<Enrollment>(id, { status });
export const deleteEnrollment = (id: string) => col().delete(id);
