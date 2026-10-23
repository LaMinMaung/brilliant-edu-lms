import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PbMock } from "../test/pbMock";
import pb from "../lib/pocketbase";

vi.mock("../lib/pocketbase", async () => ({ default: (await import("../test/pbMock")).makePbMock() }));
const pbMock = pb as unknown as PbMock;

import { countUnread, deleteNotification, listNotifications, markAllRead, markRead, subscribeNotifications } from "./notifications";

describe("notification services", () => {
  beforeEach(() => {
    Object.values(pbMock.collections).forEach((c) => Object.values(c).forEach((fn) => fn.mockClear()));
  });

  it("lists only the user's notifications, optionally unread", async () => {
    await listNotifications("u1");
    const col = pbMock.collection("notifications");
    expect(col.getList).toHaveBeenLastCalledWith(1, 20, expect.objectContaining({ filter: "user = 'u1'", sort: "-created" }));
    await listNotifications("u1", { unreadOnly: true, page: 2 });
    expect(col.getList).toHaveBeenLastCalledWith(2, 20, expect.objectContaining({ filter: "user = 'u1' && read = false" }));
  });

  it("counts unread", async () => {
    pbMock.collection("notifications").getList.mockResolvedValueOnce({ totalItems: 4, items: [] });
    await expect(countUnread("u1")).resolves.toBe(4);
    expect(pbMock.collection("notifications").getList).toHaveBeenLastCalledWith(1, 1, expect.objectContaining({ filter: "user = 'u1' && read = false" }));
  });

  it("marking read only sends read fields (content can't be changed)", async () => {
    await markRead("n1");
    const [id, body] = pbMock.collection("notifications").update.mock.calls[0];
    expect(id).toBe("n1");
    expect(Object.keys(body).sort()).toEqual(["read", "read_at"]);
    expect(body.read).toBe(true);
  });

  it("mark all read updates every unread notification", async () => {
    const col = pbMock.collection("notifications");
    col.getFullList.mockResolvedValueOnce([{ id: "a" }, { id: "b" }]);
    await expect(markAllRead("u1")).resolves.toBe(2);
    expect(col.getFullList).toHaveBeenCalledWith(expect.objectContaining({ filter: "user = 'u1' && read = false" }));
    expect(col.update.mock.calls.map((c) => c[0])).toEqual(["a", "b"]);
  });

  it("deletes and subscribes to own notifications", async () => {
    await deleteNotification("n2");
    expect(pbMock.collection("notifications").delete).toHaveBeenCalledWith("n2");
    const cb = vi.fn();
    await subscribeNotifications("u1", cb);
    expect(pbMock.collection("notifications").subscribe).toHaveBeenCalledWith("*", cb, { filter: "user = 'u1'" });
  });
});
