import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ role: { dashboard: "instructor" } }) }));
vi.mock("../../services/grades", () => ({ getGradingQueue: vi.fn() }));
vi.mock("../../components/assignment/GradeSubmissionModal", () => ({ GradeSubmissionModal: ({ submissionId }: { submissionId: string | null }) => (submissionId ? <p>grade {submissionId}</p> : null) }));
vi.mock("../../components/quiz/AttemptReviewModal", () => ({ AttemptReviewModal: ({ attemptId }: { attemptId: string | null }) => (attemptId ? <p>review {attemptId}</p> : null) }));

import { getGradingQueue } from "../../services/grades";
import GradingQueuePage from "./GradingQueuePage";

describe("GradingQueuePage", () => {
  it("lists submissions and quiz attempts awaiting grading and opens the right tool", async () => {
    vi.mocked(getGradingQueue).mockResolvedValue({ items: [
      { kind: "submission", id: "s1", submitted_at: "2026-10-11 10:00:00.000Z", late: true, student: "Sam", course_id: "c1", course: "Biology", activity_id: "a1", activity: "Essay 1" },
      { kind: "quiz_attempt", id: "t1", submitted_at: "2026-10-12 10:00:00.000Z", late: false, student: "Ada", course_id: "c1", course: "Biology", activity_id: "q1", activity: "Quiz 1" },
    ] });
    const user = userEvent.setup();
    renderWithRouter(<GradingQueuePage />);
    expect(await screen.findByRole("link", { name: "Essay 1" })).toHaveAttribute("href", "/teach/courses/c1/lessons/a1?tab=submissions");
    expect(screen.getByRole("link", { name: "Quiz 1" })).toHaveAttribute("href", "/teach/courses/c1/lessons/q1?tab=attempts");
    expect(screen.getByText("Late")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Grade" }));
    expect(screen.getByText("grade s1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review answers" }));
    expect(screen.getByText("review t1")).toBeInTheDocument();
  });

  it("shows an all-caught-up state", async () => {
    vi.mocked(getGradingQueue).mockResolvedValue({ items: [] });
    renderWithRouter(<GradingQueuePage />);
    expect(await screen.findByText("All caught up")).toBeInTheDocument();
  });
});
