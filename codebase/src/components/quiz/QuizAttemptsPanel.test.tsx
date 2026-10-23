import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";
import type { Quiz } from "../../lib/types-phase2";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("./AttemptReviewModal", () => ({ AttemptReviewModal: ({ attemptId }: { attemptId: string | null }) => (attemptId ? <p>reviewing {attemptId}</p> : null) }));
vi.mock("../../services/quizzes", () => ({
  listQuizAttempts: vi.fn().mockResolvedValue([
    { id: "t2", attempt_number: 2, status: "needs_grading", percent: 0, score: 0, max_score: 5, passed: false, submitted_at: "2026-10-12 10:00:00.000Z", auto_submitted: true, expand: { user: { name: "Sam" } } },
    { id: "t1", attempt_number: 1, status: "graded", percent: 100, score: 5, max_score: 5, passed: true, submitted_at: "2026-10-11 10:00:00.000Z", auto_submitted: false, expand: { user: { name: "Sam" } } },
  ]),
}));

import { QuizAttemptsPanel } from "./QuizAttemptsPanel";

describe("QuizAttemptsPanel", () => {
  it("highlights attempts needing grading and opens a review", async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuizAttemptsPanel quiz={{ id: "qz1" } as Quiz} />);
    expect(await screen.findByText("1 attempt needs manual grading.")).toBeInTheDocument();
    expect(screen.getByText("#2 · auto")).toBeInTheDocument();
    expect(screen.getByText("100% (5/5) · passed")).toBeInTheDocument();
    await user.click(screen.getByText("#2 · auto"));
    expect(screen.getByText("reviewing t2")).toBeInTheDocument();
  });
});
