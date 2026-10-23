import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";
import type { Quiz } from "../../lib/types-phase2";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../services/quizzes", () => ({ updateQuiz: vi.fn().mockResolvedValue({ id: "qz1" }) }));

import { updateQuiz } from "../../services/quizzes";
import { QuizSettingsForm } from "./QuizSettingsForm";

const quiz = { id: "qz1", activity: "a1", course: "c1", time_limit_minutes: 0, max_attempts: 1, passing_score: 50, shuffle_questions: false, shuffle_choices: false, available_from: "", available_until: "", show_results: "immediately", show_correct_answers: false } as Quiz;

describe("QuizSettingsForm", () => {
  it("rejects an invalid pass mark", async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuizSettingsForm quiz={quiz} onSaved={vi.fn()} />);
    const pass = screen.getByLabelText("Passing score (%)");
    await user.clear(pass);
    await user.type(pass, "120");
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    expect(screen.getByRole("alert")).toHaveTextContent("between 0 and 100");
    expect(updateQuiz).not.toHaveBeenCalled();
  });

  it("saves time limit, attempts, visibility and shuffle options", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderWithRouter(<QuizSettingsForm quiz={quiz} onSaved={onSaved} />);
    const limit = screen.getByLabelText(/Time limit/);
    await user.clear(limit);
    await user.type(limit, "15");
    const attempts = screen.getByLabelText(/Attempts allowed/);
    await user.clear(attempts);
    await user.type(attempts, "3");
    await user.selectOptions(screen.getByLabelText("Show results to students"), "after_close");
    await user.click(screen.getByRole("switch", { name: /Shuffle questions/ }));
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(updateQuiz).toHaveBeenCalledWith("qz1", expect.objectContaining({ time_limit_minutes: 15, max_attempts: 3, show_results: "after_close", shuffle_questions: true, available_from: "", available_until: "" }));
  });
});
