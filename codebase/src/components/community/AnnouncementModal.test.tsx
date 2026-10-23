import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useAuth", () => ({ useCurrentUser: () => ({ user: { id: "u1" } }) }));
vi.mock("../editor/RichTextEditor", () => ({
  RichTextEditor: ({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) => (
    <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("../../services/community", () => ({ createAnnouncement: vi.fn().mockResolvedValue({}), updateAnnouncement: vi.fn() }));

import { createAnnouncement } from "../../services/community";
import { AnnouncementModal } from "./AnnouncementModal";

describe("AnnouncementModal", () => {
  it("requires a title and message, then posts as the current user", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderWithRouter(<AnnouncementModal open onClose={vi.fn()} courseId="c1" onSaved={onSaved} />);
    await user.click(screen.getByRole("button", { name: "Post announcement" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Title is required.");
    await user.type(screen.getByLabelText(/Title/), "Exam moved");
    await user.click(screen.getByRole("button", { name: "Post announcement" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Write the announcement text.");
    await user.type(screen.getByLabelText("Message"), "<p>Now on Monday</p>");
    await user.click(screen.getByRole("switch", { name: /Pin to top/ }));
    await user.click(screen.getByRole("button", { name: "Post announcement" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(createAnnouncement).toHaveBeenCalledWith("c1", "u1", { title: "Exam moved", body: "<p>Now on Monday</p>", pinned: true, published: true });
  });
});
