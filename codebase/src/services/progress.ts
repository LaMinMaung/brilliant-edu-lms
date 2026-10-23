import pb from "../lib/pocketbase";
import type { ActivityProgress } from "../lib/types";

const col = () => pb.collection("activity_progress");

export const listMyProgress = (userId: string, courseId: string) =>
  col().getFullList<ActivityProgress>({
    filter: pb.filter("user = {:u} && course = {:c}", { u: userId, c: courseId }),
    requestKey: null,
  });

export const listCourseProgress = (courseId: string) =>
  col().getFullList<ActivityProgress>({
    filter: pb.filter("course = {:c}", { c: courseId }),
    requestKey: null,
  });

export const countMyCompleted = (userId: string) =>
  col()
    .getList(1, 1, { filter: pb.filter("user = {:u} && completed = true", { u: userId }), requestKey: null })
    .then((r) => r.totalItems);

/** Records that a lesson was opened; auto-completes "view" lessons. Server recalculates course progress. */
export async function recordAccess(
  existing: ActivityProgress | undefined,
  args: { userId: string; courseId: string; activityId: string; autoComplete: boolean },
) {
  const now = new Date().toISOString();
  if (existing) {
    const patch: Record<string, unknown> = { last_accessed: now, view_count: (existing.view_count || 0) + 1 };
    if (args.autoComplete && !existing.completed) Object.assign(patch, { completed: true, completed_at: now });
    return col().update<ActivityProgress>(existing.id, patch, { requestKey: null });
  }
  return col().create<ActivityProgress>(
    {
      user: args.userId,
      course: args.courseId,
      activity: args.activityId,
      first_accessed: now,
      last_accessed: now,
      view_count: 1,
      completed: args.autoComplete,
      completed_at: args.autoComplete ? now : "",
    },
    { requestKey: null },
  );
}

export function setCompleted(id: string, completed: boolean) {
  return col().update<ActivityProgress>(id, {
    completed,
    completed_at: completed ? new Date().toISOString() : "",
  });
}
