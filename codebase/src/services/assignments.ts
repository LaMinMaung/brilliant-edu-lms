import pb from "../lib/pocketbase";
import type { Assignment, Submission } from "../lib/types-phase2";

export const getAssignmentByActivity = (activityId: string) =>
  pb.collection("assignments").getFirstListItem<Assignment>(pb.filter("activity = {:a}", { a: activityId }), { requestKey: null });

export const updateAssignment = (id: string, data: Partial<Assignment>) => pb.collection("assignments").update<Assignment>(id, data);

/** A student's own submissions (access rules return only their records). */
export const listMySubmissions = (assignmentId: string, userId: string) =>
  pb.collection("submissions").getFullList<Submission>({
    filter: pb.filter("assignment = {:a} && user = {:u}", { a: assignmentId, u: userId }),
    sort: "-number",
    requestKey: null,
  });

/** Staff: every submission for an assignment. */
export const listSubmissions = (assignmentId: string) =>
  pb.collection("submissions").getFullList<Submission>({
    filter: pb.filter("assignment = {:a}", { a: assignmentId }),
    sort: "-submitted_at",
    expand: "user",
    requestKey: null,
  });

export const getSubmission = (id: string) =>
  pb.collection("submissions").getOne<Submission>(id, { expand: "user,graded_by", requestKey: null });

export const listUserSubmissions = (assignmentId: string, userId: string) =>
  pb.collection("submissions").getFullList<Submission>({
    filter: pb.filter("assignment = {:a} && user = {:u}", { a: assignmentId, u: userId }),
    sort: "-number",
    requestKey: null,
  });

/** Submissions go through a server endpoint that validates deadlines, limits, file types and sizes. */
export function submitAssignment(activityId: string, text: string, files: File[]) {
  const fd = new FormData();
  fd.append("text", text);
  files.forEach((f) => fd.append("files", f));
  return pb.send<Submission>(`/api/lms/assignments/${activityId}/submit`, { method: "POST", body: fd, requestKey: null });
}

export const gradeSubmission = (id: string, grade: number, feedback: string) =>
  pb.send<Submission>(`/api/lms/submissions/${id}/grade`, { method: "POST", body: { grade, feedback } });

/** Upcoming deadlines across the courses a learner can see (rules scope the list). */
export const listUpcomingAssignments = (limit = 6) =>
  pb.collection("assignments").getList<Assignment & { expand?: { activity?: { id: string; title: string; course: string }; course?: { id: string; title: string } } }>(1, limit, {
    filter: pb.filter("due_at != '' && due_at > {:now}", { now: new Date(Date.now() - 86400000).toISOString().replace("T", " ") }),
    sort: "due_at",
    expand: "activity,course",
    requestKey: null,
  });

/** Client-side mirror of the server checks, for instant feedback (the server re-validates). */
export function validateSubmissionFiles(asg: Pick<Assignment, "allowed_extensions" | "max_file_mb" | "max_files">, files: File[]) {
  const allowed = (asg.allowed_extensions || "").toLowerCase().split(/[\s,;.]+/).filter(Boolean);
  if (files.length > (asg.max_files || 1)) return `You can attach at most ${asg.max_files || 1} file(s).`;
  for (const f of files) {
    const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "";
    if (allowed.length && !allowed.includes(ext)) return `"${f.name}" is not an allowed file type. Allowed: ${allowed.join(", ")}.`;
    if (f.size > (asg.max_file_mb || 10) * 1024 * 1024) return `"${f.name}" is larger than ${asg.max_file_mb || 10} MB.`;
  }
  return null;
}
