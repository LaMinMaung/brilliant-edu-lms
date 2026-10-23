import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";
import type { AttemptPayload } from "../../lib/types-phase2";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../services/quizzes", () => ({ gradeResponse: vi.fn() }));

import { gradeResponse } from "../../services/quizzes";
import { AttemptReview } from "./AttemptReview";

const base: AttemptPayload = {
  attempt: { id: "att1", attempt_number: 2, status: "graded", started_at: "", deadline: "", submitted_at: "2026-10-12 10:00:00.000Z", auto_submitted: false, score: 2, max_score: 5, percent: 40, passed: false },
  results_visible: true,
  key_visible: false,
  server_time: "",
  questions: [
    { id: "q1", type: "multiple_choice", prompt: "Energy organelle?", points: 2, multiple: false, choices: [{ id: "a", text: "Nucleus" }, { id: "b", text: "Mitochondria" }], answer: ["a"], is_correct: false, points_awarded: 0, needs_review: false },
    { id: "q3", type: "short_answer", prompt: "Process?", points: 2, multiple: false, choices: [], answer: "chlorophyll", is_correct: false, points_awarded: 0, needs_review: true, response_id: "r3" },
  ],
};

describe("AttemptReview", () => {
  it("shows score and the student's answers but hides the key when not allowed", () => {
    renderWithRouter(<AttemptReview payload={base} />);
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("Not passed")).toBeInTheDocument();
    expect(screen.getByText("Nucleus")).toBeInTheDocument();
    expect(screen.getByText("Awaiting review")).toBeInTheDocument();
    expect(screen.queryByText("Correct answer")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /grade/i })).not.toBeInTheDocument();
  });

  it("reveals correct answers and explanations when the quiz allows it", () => {
    const withKey: AttemptPayload = { ...base, key_visible: true, questions: [{ ...base.questions[0], correct: ["b"], explanation: "Mitochondria make ATP." }] };
    renderWithRouter(<AttemptReview payload={withKey} />);
    expect(screen.getByText("Correct answer")).toBeInTheDocument();
    expect(screen.getByText("Mitochondria")).toBeInTheDocument();
    expect(screen.getByText("Mitochondria make ATP.")).toBeInTheDocument();
  });

  it("lets staff grade a short answer awaiting review", async () => {
    const updated = { ...base, attempt: { ...base.attempt, score: 3 } };
    vi.mocked(gradeResponse).mockResolvedValue(updated);
    const onGraded = vi.fn();
    const user = userEvent.setup();
    renderWithRouter(<AttemptReview payload={base} canGrade onGraded={onGraded} />);
    expect(screen.getAllByText("Student answer").length).toBe(2);
    const pts = screen.getByLabelText(/Points \(max 2\)/);
    await user.clear(pts);
    await user.type(pts, "1");
    await user.type(screen.getByLabelText("Feedback"), "Close");
    await user.click(screen.getByRole("button", { name: "Grade" }));
    await waitFor(() => expect(onGraded).toHaveBeenCalledWith(updated));
    expect(gradeResponse).toHaveBeenCalledWith("r3", 1, "Close");
  });
});
