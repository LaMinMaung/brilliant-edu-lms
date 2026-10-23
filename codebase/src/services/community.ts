import pb from "../lib/pocketbase";
import type { Announcement, DiscussionReply, DiscussionTopic } from "../lib/types-phase2";

// ---------------- Announcements ----------------

export const listAnnouncements = (courseId: string) =>
  pb.collection("announcements").getFullList<Announcement>({
    filter: pb.filter("course = {:c}", { c: courseId }),
    sort: "-pinned,-created",
    expand: "author",
    requestKey: null,
  });

export type AnnouncementInput = Pick<Announcement, "title" | "body" | "pinned" | "published">;

export const createAnnouncement = (courseId: string, authorId: string, input: AnnouncementInput) =>
  pb.collection("announcements").create<Announcement>({ ...input, course: courseId, author: authorId });
export const updateAnnouncement = (id: string, input: Partial<AnnouncementInput>) => pb.collection("announcements").update<Announcement>(id, input);
export const deleteAnnouncement = (id: string) => pb.collection("announcements").delete(id);

// ---------------- Discussions ----------------

export const listTopics = (courseId: string, search = "") =>
  pb.collection("discussion_topics").getFullList<DiscussionTopic>({
    filter: [pb.filter("course = {:c}", { c: courseId }), search ? pb.filter("(title ~ {:q} || body ~ {:q})", { q: search }) : ""].filter(Boolean).join(" && "),
    sort: "-pinned,-last_activity_at",
    expand: "author",
    requestKey: null,
  });

export const getTopic = (id: string) => pb.collection("discussion_topics").getOne<DiscussionTopic>(id, { expand: "author", requestKey: null });

export const createTopic = (courseId: string, authorId: string, title: string, body: string) =>
  pb.collection("discussion_topics").create<DiscussionTopic>({ course: courseId, author: authorId, title, body });
export const updateTopic = (id: string, data: Partial<Pick<DiscussionTopic, "title" | "body" | "pinned" | "locked">>) =>
  pb.collection("discussion_topics").update<DiscussionTopic>(id, data, { expand: "author" });
export const deleteTopic = (id: string) => pb.collection("discussion_topics").delete(id);

export const listReplies = (topicId: string) =>
  pb.collection("discussion_replies").getFullList<DiscussionReply>({
    filter: pb.filter("topic = {:t}", { t: topicId }),
    sort: "created",
    expand: "author",
    requestKey: null,
  });

export const createReply = (topic: DiscussionTopic, authorId: string, body: string) =>
  pb.collection("discussion_replies").create<DiscussionReply>({ topic: topic.id, course: topic.course, author: authorId, body }, { expand: "author" });
export const updateReply = (id: string, body: string) => pb.collection("discussion_replies").update<DiscussionReply>(id, { body }, { expand: "author" });
export const deleteReply = (id: string) => pb.collection("discussion_replies").delete(id);
