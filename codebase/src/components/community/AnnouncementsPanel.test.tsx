import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useCurrentUser: () => ({ user: { id: "u1" } }) }));
vi.mock("../../services/community", () => ({
  listAnnouncements: vi.fn().mockResolvedValue([
    { id: "a1", title: "Exam on Friday", body: '<p>Bring a pen</p><img src=x onerror="alert(1)">', pinned: true, published: true, created: "2026-10-12 10:00:00.000Z", updated: "2026-10-12 10:00:00.000Z", expand: { author: { name: "Tess" } } },
  ]),
  deleteAnnouncement: vi.fn(),
  createAnnouncement: vi.fn(),
  updateAnnouncement: vi.fn(),
}));

import { AnnouncementsPanel } from "./AnnouncementsPanel";

describe("AnnouncementsPanel", () => {
  it("shows sanitised announcements read-only to learners", async () => {
    const { container } = renderWithRouter(<AnnouncementsPanel courseId="c1" canManage={false} />);
    expect(await screen.findByText("Exam on Friday")).toBeInTheDocument();
    expect(screen.getByText("Bring a pen")).toBeInTheDocument();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(screen.getByText("Pinned")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New announcement" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit announcement" })).not.toBeInTheDocument();
  });

  it("gives staff create, edit and delete controls", async () => {
    renderWithRouter(<AnnouncementsPanel courseId="c1" canManage />);
    await screen.findByText("Exam on Friday");
    expect(screen.getByRole("button", { name: "New announcement" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit announcement" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete announcement" })).toBeInTheDocument();
  });
});
