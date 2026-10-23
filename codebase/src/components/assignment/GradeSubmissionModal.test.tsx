import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../services/assignments", () => ({
  getSubmission: vi.fn().mockResolvedValue({ id: "s2", activity: "a1", assignment: "asg1", user: "u5", number: 2, text: "Revised essay", files: [], file_meta: [], submitted_at: "2026-10-12 10:00:00.000Z", is_late: true, status: "submitted", grade: 0, feedback: "", expand: { user: { name: "Sam Student" } } }),
  getAssignmentByActivity: vi.fn().mockResolvedValue({ id: "asg1", max_marks: 20 }),
  listUserSubmissions: vi.fn().mockResolvedValue([
    { id: "s2", number: 2 },
    { id: "s1", number: 1, text: "First draft", files: [], submitted_at: "2026-10-11 10:00:00.000Z", status: "submitted" },
  ]),
  gradeSubmission: vi.fn().mockResolvedValue({ id: "s2", status: "graded", grade: 15 }),
}));

import { gradeSubmission, listUserSubmissions } from "../../services/assignments";
import { GradeSubmissionModal } from "./GradeSubmissionModal";

describe("GradeSubmissionModal", () => {
  it("shows the submission (late) with history and enforces the mark range", async () => {
    const user = userEvent.setup();
    const onGraded = vi.fn();
    renderWithRouter(<GradeSubmissionModal submissionId="s2" onClose={vi.fn()} onGraded={onGraded} />);
    expect(await screen.findByText("Revised essay")).toBeInTheDocument();
    expect(screen.getByText("Grade: Sam Student")).toBeInTheDocument();
    expect(screen.getByText("Late")).toBeInTheDocument();
    expect(screen.getByText("Earlier submissions (1)")).toBeInTheDocument();
    expect(listUserSubmissions).toHaveBeenCalledWith("asg1", "u5");

    await user.type(screen.getByLabelText("Grade (out of 20)"), "25");
    await user.click(screen.getByRole("button", { name: "Save grade" }));
    expect(screen.getByRole("alert")).toHaveTextContent("between 0 and 20");

    const grade = screen.getByLabelText("Grade (out of 20)");
    await user.clear(grade);
    await user.type(grade, "15");
    await user.type(screen.getByLabelText("Feedback"), "Add sources.");
    await user.click(screen.getByRole("button", { name: "Save grade" }));
    await waitFor(() => expect(onGraded).toHaveBeenCalled());
    expect(gradeSubmission).toHaveBeenCalledWith("s2", 15, "Add sources.");
  });
});
