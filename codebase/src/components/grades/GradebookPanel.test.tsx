import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../services/grades", async (importOriginal) => ({ ...(await importOriginal<typeof import("../../services/grades")>()), getGradebook: vi.fn() }));

import { getGradebook } from "../../services/grades";
import { GradebookPanel } from "./GradebookPanel";

const book = {
  course: { id: "c1", title: "Biology" }, is_staff: true,
  columns: [
    { activity_id: "q", title: "Quiz 1", type: "quiz", published: true, max: 0, due_at: "", passing: 60 },
    { activity_id: "a", title: "Essay", type: "assignment", published: false, max: 20, due_at: "", passing: 10 },
  ],
  rows: [{
    user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com" },
    cells: {
      q: { status: "graded", score: 4, max: 5, percent: 80, passed: true, late: false, needs_grading: false },
      a: { status: "submitted", score: null, max: 20, percent: null, passed: null, late: true, needs_grading: true },
    },
    earned: 4, possible: 5, percent: 80,
  }],
};

describe("GradebookPanel", () => {
  it("renders learners × activities with totals and an export button", async () => {
    vi.mocked(getGradebook).mockResolvedValue(book as never);
    renderWithRouter(<GradebookPanel courseId="c1" />);
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getAllByText("80%")).toHaveLength(2);
    expect(screen.getByText("To grade")).toBeInTheDocument();
    expect(screen.getByText("· late")).toBeInTheDocument();
    expect(screen.getByText(/assignment · draft/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeInTheDocument();
    expect(getGradebook).toHaveBeenCalledWith("c1");
  });

  it("explains when there is nothing to grade", async () => {
    vi.mocked(getGradebook).mockResolvedValue({ ...book, columns: [] } as never);
    renderWithRouter(<GradebookPanel courseId="c1" />);
    expect(await screen.findByText("Nothing to grade yet")).toBeInTheDocument();
  });
});
