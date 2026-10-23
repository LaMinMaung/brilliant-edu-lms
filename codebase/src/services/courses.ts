import pb from "../lib/pocketbase";
import type { Course, CourseStatus } from "../lib/types";

const col = () => pb.collection("courses");
const EXPAND = "category,instructors,owner";

export interface CourseFilters {
  search?: string;
  status?: CourseStatus | "";
  categoryIds?: string[];
  teacherId?: string;
  level?: string;
  page?: number;
  perPage?: number;
  sort?: string;
}

export function buildCourseFilter({ search, status, categoryIds, teacherId, level }: CourseFilters) {
  const parts: string[] = [];
  if (level) parts.push(pb.filter("level = {:l}", { l: level }));
  if (search) parts.push(pb.filter("(title ~ {:q} || summary ~ {:q})", { q: search }));
  if (status) parts.push(pb.filter("status = {:s}", { s: status }));
  if (categoryIds?.length) {
    parts.push("(" + categoryIds.map((id) => pb.filter("category = {:id}", { id })).join(" || ") + ")");
  }
  if (teacherId) parts.push(pb.filter("(owner = {:t} || instructors.id ?= {:t})", { t: teacherId }));
  return parts.join(" && ");
}

export function listCourses(filters: CourseFilters = {}) {
  const { page = 1, perPage = 24, sort = "-updated" } = filters;
  return col().getList<Course>(page, perPage, {
    filter: buildCourseFilter(filters),
    sort,
    expand: EXPAND,
    requestKey: null,
  });
}

export function listAllCourses(filters: CourseFilters = {}) {
  return col().getFullList<Course>({
    filter: buildCourseFilter(filters),
    sort: filters.sort || "title",
    expand: EXPAND,
    requestKey: null,
  });
}

export const getCourse = (id: string) => col().getOne<Course>(id, { expand: EXPAND, requestKey: null });

export const createCourse = (data: FormData | Record<string, unknown>) => col().create<Course>(data, { expand: EXPAND });
export const updateCourse = (id: string, data: FormData | Record<string, unknown>) =>
  col().update<Course>(id, data, { expand: EXPAND });
export const deleteCourse = (id: string) => col().delete(id);

export async function slugAvailable(slug: string, excludeId?: string) {
  const filter = excludeId
    ? pb.filter("slug = {:s} && id != {:id}", { s: slug, id: excludeId })
    : pb.filter("slug = {:s}", { s: slug });
  const res = await col().getList(1, 1, { filter, requestKey: null });
  return res.totalItems === 0;
}
