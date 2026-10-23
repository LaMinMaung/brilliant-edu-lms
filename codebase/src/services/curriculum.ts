import pb from "../lib/pocketbase";
import type { Activity, Material, Section } from "../lib/types";

const sections = () => pb.collection("course_sections");
const activities = () => pb.collection("activities");
const materials = () => pb.collection("materials");

// ---- Sections ----
export const listSections = (courseId: string) =>
  sections().getFullList<Section>({
    filter: pb.filter("course = {:c}", { c: courseId }),
    sort: "sort_order,created",
    requestKey: null,
  });
export const createSection = (data: Partial<Section>) => sections().create<Section>(data);
export const updateSection = (id: string, data: Partial<Section>) => sections().update<Section>(id, data);
export const deleteSection = (id: string) => sections().delete(id);

// ---- Activities (lessons today; quiz/assignment/etc. later via `type`) ----
export const listActivities = (courseId: string) =>
  activities().getFullList<Activity>({
    filter: pb.filter("course = {:c}", { c: courseId }),
    sort: "sort_order,created",
    fields: "id,course,section,type,title,description,sort_order,is_published,completion_mode,estimated_minutes,created,updated",
    requestKey: null,
  });
export const getActivity = (id: string) => activities().getOne<Activity>(id, { requestKey: null });
export const createActivity = (data: Partial<Activity>) => activities().create<Activity>(data);
export const updateActivity = (id: string, data: Partial<Activity>) => activities().update<Activity>(id, data);
export const deleteActivity = (id: string) => activities().delete(id);

/** Persists a new order by writing sequential sort_order values. */
export async function reorder(kind: "sections" | "activities", ids: string[]) {
  const c = kind === "sections" ? sections() : activities();
  await Promise.all(ids.map((id, i) => c.update(id, { sort_order: i })));
}

// ---- Materials ----
export const listMaterials = (activityId: string) =>
  materials().getFullList<Material>({
    filter: pb.filter("activity = {:a}", { a: activityId }),
    sort: "sort_order,created",
    requestKey: null,
  });
export const createMaterial = (data: FormData | Record<string, unknown>) => materials().create<Material>(data);
export const updateMaterial = (id: string, data: Partial<Material>) => materials().update<Material>(id, data);
export const deleteMaterial = (id: string) => materials().delete(id);

export interface SectionWithActivities extends Section {
  activities: Activity[];
}

export function groupCurriculum(secs: Section[], acts: Activity[]): SectionWithActivities[] {
  return secs.map((s) => ({ ...s, activities: acts.filter((a) => a.section === s.id) }));
}
