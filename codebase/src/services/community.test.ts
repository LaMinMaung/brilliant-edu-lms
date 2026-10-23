import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PbMock } from "../test/pbMock";
import pb from "../lib/pocketbase";

vi.mock("../lib/pocketbase", async () => ({ default: (await import("../test/pbMock")).makePbMock() }));
const pbMock = pb as unknown as PbMock;

import { createAnnouncement, createReply, createTopic, listAnnouncements, listTopics, updateTopic } from "./community";
import type { DiscussionTopic } from "../lib/types-phase2";

describe("community services", () => {
  beforeEach(() => {
    Object.values(pbMock.collections).forEach((c) => Object.values(c).forEach((fn) => fn.mockClear()));
  });

  it("lists course announcements pinned first", async () => {
    await listAnnouncements("c1");
    expect(pbMock.collection("announcements").getFullList).toHaveBeenCalledWith(expect.objectContaining({ filter: "course = 'c1'", sort: "-pinned,-created" }));
  });

  it("creates announcements authored by the current user", async () => {
    await createAnnouncement("c1", "u9", { title: "Exam", body: "<p>Friday</p>", pinned: false, published: true });
    expect(pbMock.collection("announcements").create).toHaveBeenCalledWith({ title: "Exam", body: "<p>Friday</p>", pinned: false, published: true, course: "c1", author: "u9" });
  });

  it("searches topics within the course", async () => {
    await listTopics("c1", "atp");
    expect(pbMock.collection("discussion_topics").getFullList).toHaveBeenCalledWith(expect.objectContaining({ filter: "course = 'c1' && (title ~ 'atp' || body ~ 'atp')", sort: "-pinned,-last_activity_at" }));
  });

  it("never sends server-managed counters when creating topics", async () => {
    await createTopic("c1", "u1", "Help", "What is ATP?");
    const body = pbMock.collection("discussion_topics").create.mock.calls[0][0];
    expect(body).toEqual({ course: "c1", author: "u1", title: "Help", body: "What is ATP?" });
    expect(body).not.toHaveProperty("reply_count");
  });

  it("replies carry the topic's course; moderation sends only the changed flag", async () => {
    await createReply({ id: "t1", course: "c1" } as DiscussionTopic, "u2", "Energy");
    expect(pbMock.collection("discussion_replies").create).toHaveBeenCalledWith({ topic: "t1", course: "c1", author: "u2", body: "Energy" }, { expand: "author" });
    await updateTopic("t1", { locked: true });
    expect(pbMock.collection("discussion_topics").update).toHaveBeenCalledWith("t1", { locked: true }, { expand: "author" });
  });
});
