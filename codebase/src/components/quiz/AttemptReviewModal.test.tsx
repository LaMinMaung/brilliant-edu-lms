import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../services/quizzes", () => ({
  getAttempt: vi.fn().mockResolvedValue({
    attempt: { id: "t2", attempt_number: 2, status: "needs_grading", started_at: "", deadline: "", submitted_at: "", auto_submitted: false, score: 0, max_score: 2, percent: 0, passed: false },
    results_visible: true, key_visible: true, server_time: "",
    student: { id: "u5", name: "Sam Student" },
    questions: [{ id: "q3", type: "short_answer", prompt: "Process?", points: 2, multiple: false, choices: [], answer: "chlorophyll", needs_review: true, response_id: "r3", correct: ["photosynthesis"] }],
  }),
  gradeResponse: vi.fn(),
}));

import { getAttempt } from "../../services/quizzes";
import { AttemptReviewModal } from "./AttemptReviewModal";

describe("AttemptReviewModal", () => {
  it("loads the staff view of an attempt with the key and a grading form", async () => {
    renderWithRouter(<AttemptReviewModal attemptId="t2" onClose={vi.fn()} />);
    expect(await screen.findByText("Sam Student · attempt 2")).toBeInTheDocument();
    expect(screen.getByText("photosynthesis")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grade" })).toBeInTheDocument();
    expect(getAttempt).toHaveBeenCalledWith("t2");
  });

  it("renders nothing when closed", () => {
    renderWithRouter(<AttemptReviewModal attemptId={null} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
