import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientResponseError } from "pocketbase";
import { renderWithRouter } from "../../test/utils";
import type { AttemptPayload } from "../../lib/types-phase2";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../services/quizzes", () => ({ saveAnswers: vi.fn(), submitAttempt: vi.fn(), getAttempt: vi.fn() }));

import { getAttempt, saveAnswers, submitAttempt } from "../../services/quizzes";
import { QuizTaker } from "./QuizTaker";

const payload: AttemptPayload = {
  attempt: { id: "att1", attempt_number: 1, status: "in_progress", started_at: "", deadline: "", submitted_at: "", auto_submitted: false },
  results_visible: false,
  key_visible: false,
  server_time: new Date().toISOString(),
  questions: [
    { id: "q1", type: "multiple_choice", prompt: "Which organelle makes energy?", points: 2, multiple: false, choices: [{ id: "a", text: "Nucleus" }, { id: "b", text: "Mitochondria" }], answer: null },
    { id: "q2", type: "true_false", prompt: "Plants need light.", points: 1, multiple: false, choices: [], answer: null },
    { id: "q3", type: "short_answer", prompt: "Name the process.", points: 2, multiple: false, choices: [], answer: null },
  ],
};
const graded = { ...payload, attempt: { ...payload.attempt, status: "graded" as const, percent: 100 } };

describe("QuizTaker", () => {
  beforeEach(() => {
    vi.mocked(saveAnswers).mockReset().mockResolvedValue({ saved: 3, server_time: new Date().toISOString() });
    vi.mocked(submitAttempt).mockReset().mockResolvedValue(graded);
    vi.mocked(getAttempt).mockReset().mockResolvedValue(graded);
  });

  it("renders questions without any answer key and tracks answered count", async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuizTaker payload={payload} onFinished={vi.fn()} />);
    expect(screen.getByText("0 of 3 answered")).toBeInTheDocument();
    expect(screen.queryByText(/correct answer/i)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Mitochondria"));
    await user.click(screen.getByText("True"));
    expect(screen.getByText("2 of 3 answered")).toBeInTheDocument();
  });

  it("autosaves answers to the attempt", async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuizTaker payload={payload} onFinished={vi.fn()} />);
    await user.type(screen.getByLabelText("Answer to question 3"), "photosynthesis");
    await waitFor(() => expect(saveAnswers).toHaveBeenCalled(), { timeout: 3000 });
    const [id, answers] = vi.mocked(saveAnswers).mock.calls.at(-1)!;
    expect(id).toBe("att1");
    expect(answers.q3).toBe("photosynthesis");
  });

  it("submits all answers after confirmation", async () => {
    const user = userEvent.setup();
    const onFinished = vi.fn();
    renderWithRouter(<QuizTaker payload={payload} onFinished={onFinished} />);
    await user.click(screen.getByLabelText("Mitochondria"));
    await user.click(screen.getByText("True"));
    await user.type(screen.getByLabelText("Answer to question 3"), "cell");
    await user.click(screen.getByRole("button", { name: "Submit attempt" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Submit now" }));
    await waitFor(() => expect(onFinished).toHaveBeenCalledWith(graded));
    expect(submitAttempt).toHaveBeenCalledWith("att1", { q1: ["b"], q2: "true", q3: "cell" });
  });

  it("warns about unanswered questions before submitting", async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuizTaker payload={payload} onFinished={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Submit attempt" }));
    expect(screen.getByText(/3 unanswered questions/)).toBeInTheDocument();
  });

  it("falls back to the server result when time already ran out", async () => {
    vi.mocked(submitAttempt).mockRejectedValueOnce(new ClientResponseError({ status: 409, response: { message: "Time is up" } }));
    const user = userEvent.setup();
    const onFinished = vi.fn();
    renderWithRouter(<QuizTaker payload={payload} onFinished={onFinished} />);
    await user.click(screen.getByRole("button", { name: "Submit attempt" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Submit now" }));
    await waitFor(() => expect(getAttempt).toHaveBeenCalledWith("att1"));
    expect(onFinished).toHaveBeenCalledWith(graded);
  });

  it("shows a countdown when the attempt has a deadline", () => {
    const timed = { ...payload, attempt: { ...payload.attempt, deadline: new Date(Date.now() + 5 * 60000).toISOString().replace("T", " ") } };
    renderWithRouter(<QuizTaker payload={timed} onFinished={vi.fn()} />);
    expect(screen.getByRole("timer")).toHaveTextContent(/0[45]:\d\d/);
  });
});
