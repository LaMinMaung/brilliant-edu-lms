import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";
import type { Activity } from "../../lib/types";
import type { QuizSummary } from "../../lib/types-phase2";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../services/curriculum", () => ({ getActivity: vi.fn().mockResolvedValue({ id: "qa1", content: "<p>Read chapter 2 first.</p>" }) }));
vi.mock("../../services/progress", () => ({ recordAccess: vi.fn().mockResolvedValue({ id: "p1" }) }));
vi.mock("../../services/quizzes", () => ({ getQuizSummary: vi.fn(), startAttempt: vi.fn(), getAttempt: vi.fn() }));
vi.mock("./QuizTaker", () => ({ QuizTaker: ({ payload }: { payload: { attempt: { id: string } } }) => <p>taking {payload.attempt.id}</p> }));

import { getAttempt, getQuizSummary, startAttempt } from "../../services/quizzes";
import { recordAccess } from "../../services/progress";
import { QuizView } from "./QuizView";

const summary = (over: Partial<QuizSummary> = {}): QuizSummary => ({
  quiz: { id: "qz1", time_limit_minutes: 10, max_attempts: 2, passing_score: 60, available_from: "", available_until: "", show_results: "immediately", show_correct_answers: true },
  question_count: 3, total_points: 5, attempts: [], in_progress_id: "", attempts_left: 2, can_start: true, reason: "", results_visible: true, best_percent: null, is_staff: false, ...over,
});
const activity = { id: "qa1", type: "quiz", title: "Quiz 1", course: "c1" } as Activity;
const render = (mode: "learner" | "preview" = "learner") =>
  renderWithRouter(<QuizView courseId="c1" userId="u1" activity={activity} mode={mode} onProgress={vi.fn()} onCompletionMaybeChanged={vi.fn()} />);

describe("QuizView", () => {
  beforeEach(() => { vi.mocked(startAttempt).mockReset(); vi.mocked(recordAccess).mockClear(); });

  it("shows instructions and rules, records access, and starts an attempt", async () => {
    vi.mocked(getQuizSummary).mockResolvedValue(summary());
    vi.mocked(startAttempt).mockResolvedValue({ attempt: { id: "att9" } } as never);
    const user = userEvent.setup();
    render();
    expect(await screen.findByText("Read chapter 2 first.")).toBeInTheDocument();
    expect(screen.getByText("3 questions · 5 points")).toBeInTheDocument();
    expect(screen.getByText("10 minute time limit")).toBeInTheDocument();
    expect(screen.getByText("2 attempts allowed · 2 left")).toBeInTheDocument();
    expect(recordAccess).toHaveBeenCalledWith(undefined, { userId: "u1", courseId: "c1", activityId: "qa1", autoComplete: false });
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    expect(await screen.findByText("taking att9")).toBeInTheDocument();
  });

  it("explains why a new attempt can't start", async () => {
    vi.mocked(getQuizSummary).mockResolvedValue(summary({ can_start: false, reason: "You have used all your attempts.", attempts_left: 0, best_percent: 80,
      attempts: [{ id: "t1", attempt_number: 1, status: "graded", started_at: "", submitted_at: "2026-10-12 10:00:00.000Z", auto_submitted: false, percent: 80, passed: true }] }));
    render();
    expect(await screen.findByText("You have used all your attempts.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Start/ })).not.toBeInTheDocument();
    expect(screen.getByText("80% · passed")).toBeInTheDocument();
  });

  it("respects hidden results when reviewing a submitted attempt", async () => {
    vi.mocked(getQuizSummary).mockResolvedValue(summary({ quiz: { ...summary().quiz, show_results: "never" }, results_visible: false,
      attempts: [{ id: "t1", attempt_number: 1, status: "graded", started_at: "", submitted_at: "2026-10-12 10:00:00.000Z", auto_submitted: false }] }));
    vi.mocked(getAttempt).mockResolvedValue({ attempt: { id: "t1", attempt_number: 1, status: "graded", submitted_at: "2026-10-12 10:00:00.000Z" }, results_visible: false, key_visible: false, questions: [], server_time: "" } as never);
    const user = userEvent.setup();
    render();
    expect(await screen.findByText("Hidden")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review" }));
    await waitFor(() => expect(screen.getByText(/Results will be available by your instructor only/)).toBeInTheDocument());
  });

  it("never starts attempts in staff preview", async () => {
    vi.mocked(getQuizSummary).mockResolvedValue(summary({ can_start: false, is_staff: true, reason: "Staff preview: attempts are only recorded for enrolled students." }));
    render("preview");
    expect(await screen.findByText(/Staff preview/)).toBeInTheDocument();
    expect(recordAccess).not.toHaveBeenCalled();
  });
});
