import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";
import type { Quiz } from "../../lib/types-phase2";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("./QuestionModal", () => ({ QuestionModal: () => null }));
vi.mock("./QuestionPickerModal", () => ({ QuestionPickerModal: () => null }));
vi.mock("../../services/quizzes", () => ({
  listQuizQuestions: vi.fn().mockResolvedValue([
    { id: "l1", question: "q1", points: 0, expand: { question: { id: "q1", type: "true_false", prompt: "Plants need light.", points: 1 } } },
    { id: "l2", question: "q2", points: 3, expand: { question: { id: "q2", type: "short_answer", prompt: "Name the process.", points: 2 } } },
  ]),
  listQuestionCategories: vi.fn().mockResolvedValue([]),
  addQuizQuestion: vi.fn(), setQuizQuestionPoints: vi.fn(), removeQuizQuestion: vi.fn().mockResolvedValue(true), reorderQuizQuestions: vi.fn().mockResolvedValue([]),
}));

import { removeQuizQuestion, reorderQuizQuestions, setQuizQuestionPoints } from "../../services/quizzes";
import { QuizQuestionsManager } from "./QuizQuestionsManager";

const quiz = { id: "qz1", course: "c1" } as Quiz;

describe("QuizQuestionsManager", () => {
  it("shows composition with per-quiz points overriding bank defaults", async () => {
    renderWithRouter(<QuizQuestionsManager quiz={quiz} />);
    expect(await screen.findByText("Plants need light.")).toBeInTheDocument();
    expect(screen.getByText("2 questions · 4 points total")).toBeInTheDocument();
  });

  it("reorders, changes points and removes questions", async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuizQuestionsManager quiz={quiz} />);
    await screen.findByText("Plants need light.");
    await user.click(screen.getAllByRole("button", { name: "Move down" })[0]);
    await waitFor(() => expect(reorderQuizQuestions).toHaveBeenCalledWith(["l2", "l1"]));
    const pts = screen.getByLabelText("Points for question 1");
    await user.clear(pts);
    await user.type(pts, "2");
    await user.tab();
    await waitFor(() => expect(setQuizQuestionPoints).toHaveBeenCalledWith("l1", 2));
    await user.click(screen.getAllByRole("button", { name: "Remove from quiz" })[1]);
    await waitFor(() => expect(removeQuizQuestion).toHaveBeenCalledWith("l2"));
  });
});
