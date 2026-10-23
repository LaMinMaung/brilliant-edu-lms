import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../services/grades", () => ({ getGradebook: vi.fn() }));

import { getGradebook } from "../../services/grades";
import { MyGrades } from "./MyGrades";

describe("MyGrades", () => {
  it("shows the learner's own results, hidden quiz results and missing work", async () => {
    vi.mocked(getGradebook).mockResolvedValue({
      course: { id: "c1", title: "Biology" }, is_staff: false,
      columns: [
        { activity_id: "q", title: "Quiz 1", type: "quiz", published: true, max: 0, due_at: "", passing: 60, results_visible: false },
        { activity_id: "a", title: "Essay", type: "assignment", published: true, max: 20, due_at: "2026-10-01 10:00:00.000Z", passing: 10 },
        { activity_id: "b", title: "Lab report", type: "assignment", published: true, max: 10, due_at: "", passing: 5 },
      ],
      rows: [{
        user: { id: "u1", name: "Sam", email: "s@x" },
        cells: {
          q: { status: "submitted", score: null, max: 0, percent: null, passed: null, late: false, needs_grading: false },
          a: { status: "missing", score: null, max: 20, percent: null, passed: null, late: false, needs_grading: false },
          b: { status: "graded", score: 8, max: 10, percent: 80, passed: true, late: true, needs_grading: false },
        },
        earned: 8, possible: 10, percent: 80,
      }],
    } as never);
    renderWithRouter(<MyGrades courseId="c1" />);
    expect(await screen.findByText("Hidden")).toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(screen.getByText("8 / 10")).toBeInTheDocument();
    expect(screen.getByText(/submitted late/)).toBeInTheDocument();
    expect(screen.getByText("8 of 10 points")).toBeInTheDocument();
  });
});
