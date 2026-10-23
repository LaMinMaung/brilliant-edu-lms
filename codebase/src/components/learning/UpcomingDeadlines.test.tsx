import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../services/assignments", () => ({
  listUpcomingAssignments: vi.fn().mockResolvedValue({
    items: [{ id: "asg1", activity: "a1", course: "c1", due_at: new Date(Date.now() + 5 * 3600000).toISOString().replace("T", " "), expand: { activity: { id: "a1", title: "Essay 1", course: "c1" }, course: { id: "c1", title: "Biology" } } }],
  }),
}));

import { UpcomingDeadlines } from "./UpcomingDeadlines";

describe("UpcomingDeadlines", () => {
  it("links each upcoming assignment into the course player", async () => {
    renderWithRouter(<UpcomingDeadlines />);
    expect(await screen.findByRole("link", { name: /Essay 1/ })).toHaveAttribute("href", "/learn/courses/c1/play/a1");
    expect(screen.getByText(/Due in 5 h/)).toBeInTheDocument();
  });
});
