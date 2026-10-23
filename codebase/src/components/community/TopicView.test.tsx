import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";
import type { DiscussionTopic } from "../../lib/types-phase2";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useCurrentUser: () => ({ user: { id: "u1", name: "Sam Student" } }) }));
vi.mock("../../services/community", () => ({
  getTopic: vi.fn(), listReplies: vi.fn(), createReply: vi.fn(), updateReply: vi.fn(), deleteReply: vi.fn(), deleteTopic: vi.fn(), updateTopic: vi.fn(),
}));

import { createReply, getTopic, listReplies, updateTopic } from "../../services/community";
import { TopicView } from "./TopicView";

const topic = (over: Partial<DiscussionTopic> = {}) => ({
  id: "t1", course: "c1", author: "u2", title: "What is ATP?", body: "<script>alert(1)</script> energy?", pinned: false, locked: false,
  reply_count: 0, last_activity_at: "", created: "2026-10-12 10:00:00.000Z", updated: "2026-10-12 10:00:00.000Z", expand: { author: { id: "u2", name: "Pat" } }, ...over,
} as unknown as DiscussionTopic);

describe("TopicView", () => {
  beforeEach(() => {
    vi.mocked(listReplies).mockResolvedValue([]);
    vi.mocked(createReply).mockReset();
  });

  it("renders user content as plain text and posts a reply", async () => {
    vi.mocked(getTopic).mockResolvedValue(topic());
    vi.mocked(createReply).mockResolvedValue({ id: "r1", topic: "t1", course: "c1", author: "u1", body: "Thanks!", edited: false, created: "2026-10-12 11:00:00.000Z", updated: "", expand: { author: { id: "u1", name: "Sam Student" } } } as never);
    const user = userEvent.setup();
    const { container } = renderWithRouter(<TopicView topicId="t1" canModerate={false} backHref="/back" />);
    expect(await screen.findByText(/<script>alert\(1\)<\/script> energy\?/)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    await user.type(screen.getByLabelText("Reply"), "Thanks!");
    await user.click(screen.getByRole("button", { name: "Post reply" }));
    await waitFor(() => expect(createReply).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }), "u1", "Thanks!"));
    expect(await screen.findByText("Thanks!")).toBeInTheDocument();
  });

  it("closes replies on locked topics for students and hides moderation", async () => {
    vi.mocked(getTopic).mockResolvedValue(topic({ locked: true }));
    renderWithRouter(<TopicView topicId="t1" canModerate={false} backHref="/back" />);
    expect(await screen.findByText(/This topic is locked/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Reply")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unlock" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("lets moderators pin and lock", async () => {
    vi.mocked(getTopic).mockResolvedValue(topic());
    vi.mocked(updateTopic).mockResolvedValue(topic({ locked: true }));
    const user = userEvent.setup();
    renderWithRouter(<TopicView topicId="t1" canModerate backHref="/back" />);
    await user.click(await screen.findByRole("button", { name: "Lock" }));
    expect(updateTopic).toHaveBeenCalledWith("t1", { locked: true });
    expect(await screen.findByRole("button", { name: "Unlock" })).toBeInTheDocument();
  });
});
