import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("../../services/notifications", () => ({
  countUnread: vi.fn().mockResolvedValue(3),
  subscribeNotifications: vi.fn().mockResolvedValue(() => Promise.resolve()),
}));

import { countUnread, subscribeNotifications } from "../../services/notifications";
import { NotificationBell } from "./NotificationBell";

describe("NotificationBell", () => {
  it("shows the unread count for the signed-in user and subscribes to live updates", async () => {
    renderWithRouter(<NotificationBell />);
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Notifications, 3 unread" })).toHaveAttribute("href", "/notifications");
    expect(countUnread).toHaveBeenCalledWith("u1");
    await waitFor(() => expect(subscribeNotifications).toHaveBeenCalledWith("u1", expect.any(Function)));
  });

  it("hides the badge when everything is read", async () => {
    vi.mocked(countUnread).mockResolvedValueOnce(0);
    renderWithRouter(<NotificationBell />);
    await waitFor(() => expect(countUnread).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "Notifications" })).toBeInTheDocument();
  });
});
