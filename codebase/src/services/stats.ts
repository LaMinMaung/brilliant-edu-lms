import pb from "../lib/pocketbase";
import type { ActivityLog } from "../lib/types";

/** Server-side count using the collection's access rules. */
export async function count(collection: string, filter = "") {
  const res = await pb.collection(collection).getList(1, 1, { filter, requestKey: null });
  return res.totalItems;
}

export function recentActivity(limit = 10, actorId?: string) {
  return pb.collection("activity_log").getList<ActivityLog>(1, limit, {
    sort: "-created",
    expand: "actor",
    filter: actorId ? pb.filter("actor = {:a}", { a: actorId }) : "",
    requestKey: null,
  });
}

export interface LogFilters {
  search?: string;
  area?: string;
  page?: number;
}

/** Audit log browser: `area` is the action prefix, e.g. "course" matches course.created, course.published… */
export function listActivity({ search, area, page = 1 }: LogFilters) {
  const parts: string[] = [];
  if (area) parts.push(pb.filter("action ~ {:a}", { a: `${area}.%` }));
  if (search) parts.push(pb.filter("(description ~ {:q} || actor.name ~ {:q} || actor.email ~ {:q})", { q: search }));
  return pb.collection("activity_log").getList<ActivityLog>(page, 30, {
    sort: "-created",
    expand: "actor",
    filter: parts.join(" && "),
    requestKey: null,
  });
}
