import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useCurrentUser: () => ({ user: { id: "u1" } }) }));
vi.mock("../../services/community", () => ({
  listTopics: vi.fn().mockResolvedValue([
    { id: "t1", title: "Pinned rules", body: "Be kind", pinned: true, locked: true, reply_count: 2, created: "2026-10-10 10:00:00.000Z", last_activity_at: "2026-10-11 10:00:00.000Z", expand: { author: { name: "Tess" } } },
  ]),
  createTopic: vi.fn().mockResolvedValue({ id: "t2" }),
}));

import { createTopic, listTopics } from "../../services/community";
import { DiscussionBoard } from "./DiscussionBoard";

describe("DiscussionBoard", () => {
  it("lists topics with links, pin/lock markers and reply counts", async () => {
    renderWithRouter(<DiscussionBoard courseId="c1" canModerate={false} topicHref={(id) => `/topic/${id}`} listHref="/list" />);
    const link = await screen.findByRole("link", { name: /Pinned rules/ });
    expect(link).toHaveAttribute("href", "/topic/t1");
    expect(screen.getByLabelText("Pinned")).toBeInTheDocument();
    expect(screen.getByLabelText("Locked")).toBeInTheDocument();
    expect(screen.getByText("2 replies")).toBeInTheDocument();
    expect(listTopics).toHaveBeenCalledWith("c1", "");
  });

  it("validates and creates a new topic", async () => {
    const user = userEvent.setup();
    renderWithRouter(<DiscussionBoard courseId="c1" canModerate={false} topicHref={(id) => `/topic/${id}`} listHref="/list" />);
    await user.click(await screen.findByRole("button", { name: "New topic" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Post topic" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Add a title and a message.");
    await user.type(within(dialog).getByLabelText(/Title/), "Lab question");
    await user.type(within(dialog).getByLabelText(/Message/), "How long do we incubate?");
    await user.click(within(dialog).getByRole("button", { name: "Post topic" }));
    await waitFor(() => expect(createTopic).toHaveBeenCalledWith("c1", "u1", "Lab question", "How long do we incubate?"));
  });
});
