import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test/utils";

vi.mock("../lib/pocketbase", async () => ({ default: (await import("../test/pbMock")).makePbMock() }));
vi.mock("../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../hooks/useAuth", () => ({ useCurrentUser: () => ({ user: { id: "u1" } }) }));
vi.mock("../services/notifications", () => ({
  listNotifications: vi.fn(),
  markRead: vi.fn().mockResolvedValue({}),
  markAllRead: vi.fn().mockResolvedValue(1),
  deleteNotification: vi.fn().mockResolvedValue(true),
}));

import { deleteNotification, listNotifications, markAllRead, markRead } from "../services/notifications";
import NotificationsPage from "./NotificationsPage";

const items = [
  { id: "n1", type: "announcement", title: "Announcement: Exam moved", body: "New date", link: "/learn/courses/c1/announcements", read: false, created: "2026-10-12 10:00:00.000Z", expand: { course: { title: "Biology" } } },
  { id: "n2", type: "assignment_graded", title: "Assignment graded: Essay", body: "", link: "", read: true, created: "2026-10-11 10:00:00.000Z" },
];

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.mocked(listNotifications).mockResolvedValue({ page: 1, perPage: 20, totalItems: 2, totalPages: 1, items } as never);
  });

  it("lists notifications and marks unread ones as read when opened", async () => {
    const user = userEvent.setup();
    renderWithRouter(<NotificationsPage />, { route: "/notifications", path: "/notifications" });
    expect(await screen.findByText("Announcement: Exam moved")).toBeInTheDocument();
    expect(screen.getByText("(unread)")).toBeInTheDocument();
    await user.click(screen.getByText("Announcement: Exam moved"));
    expect(markRead).toHaveBeenCalledWith("n1");
    expect(await screen.findByText("announcements-page")).toBeInTheDocument();
  });

  it("filters to unread and marks everything read", async () => {
    const user = userEvent.setup();
    renderWithRouter(<NotificationsPage />);
    await screen.findByText("Announcement: Exam moved");
    await user.click(screen.getByRole("tab", { name: "Unread" }));
    await waitFor(() => expect(listNotifications).toHaveBeenLastCalledWith("u1", { unreadOnly: true, page: 1 }));
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(markAllRead).toHaveBeenCalledWith("u1");
  });

  it("deletes a notification", async () => {
    const user = userEvent.setup();
    renderWithRouter(<NotificationsPage />);
    await screen.findByText("Assignment graded: Essay");
    await user.click(screen.getAllByRole("button", { name: "Delete notification" })[1]);
    expect(deleteNotification).toHaveBeenCalledWith("n2");
  });

  it("shows an empty state", async () => {
    vi.mocked(listNotifications).mockResolvedValue({ page: 1, perPage: 20, totalItems: 0, totalPages: 0, items: [] } as never);
    renderWithRouter(<NotificationsPage />);
    expect(await screen.findByText("No notifications yet")).toBeInTheDocument();
  });
});
