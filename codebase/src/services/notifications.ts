import pb from "../lib/pocketbase";
import type { AppNotification } from "../lib/types-phase2";

export function listNotifications(userId: string, { unreadOnly = false, page = 1, perPage = 20 } = {}) {
  const filter = [pb.filter("user = {:u}", { u: userId }), unreadOnly ? "read = false" : ""].filter(Boolean).join(" && ");
  return pb.collection("notifications").getList<AppNotification>(page, perPage, { filter, sort: "-created", expand: "course", requestKey: null });
}

export async function countUnread(userId: string) {
  const res = await pb.collection("notifications").getList(1, 1, { filter: pb.filter("user = {:u} && read = false", { u: userId }), requestKey: null });
  return res.totalItems;
}

export const markRead = (id: string) =>
  pb.collection("notifications").update<AppNotification>(id, { read: true, read_at: new Date().toISOString().replace("T", " ") });

export async function markAllRead(userId: string) {
  const unread = await pb.collection("notifications").getFullList<AppNotification>({
    filter: pb.filter("user = {:u} && read = false", { u: userId }),
    fields: "id",
    requestKey: null,
  });
  await Promise.all(unread.map((n) => markRead(n.id)));
  return unread.length;
}

export const deleteNotification = (id: string) => pb.collection("notifications").delete(id);

/** Live updates for the signed-in user's notifications (rules limit events to their own records). */
export function subscribeNotifications(userId: string, onChange: () => void) {
  return pb.collection("notifications").subscribe("*", onChange, { filter: pb.filter("user = {:u}", { u: userId }) });
}
