import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("./QuestionModal", () => ({ QuestionModal: ({ open, question }: { open: boolean; question?: { id: string } | null }) => (open ? <p>editing {question ? question.id : "new"}</p> : null) }));
vi.mock("../../services/quizzes", () => ({
  listQuestionCategories: vi.fn().mockResolvedValue([{ id: "cat1", name: "Biology" }]),
  listQuestions: vi.fn().mockResolvedValue([{ id: "q1", type: "true_false", prompt: "Plants need light.", points: 1, expand: { category: { name: "Biology" } } }]),
  createQuestionCategory: vi.fn(), renameQuestionCategory: vi.fn(), deleteQuestionCategory: vi.fn(),
  deleteQuestion: vi.fn().mockResolvedValue(true),
}));

import { deleteQuestion, listQuestions } from "../../services/quizzes";
import { QuestionBank } from "./QuestionBank";

describe("QuestionBank", () => {
  beforeEach(() => vi.mocked(listQuestions).mockClear());

  it("lists questions and filters by category and type", async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuestionBank courseId="c1" />);
    expect(await screen.findByText("Plants need light.")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Biology" })[0]);
    await waitFor(() => expect(listQuestions).toHaveBeenLastCalledWith("c1", { categoryId: "cat1", type: "", search: "" }));
    await user.selectOptions(screen.getByLabelText("Filter by type"), "short_answer");
    await waitFor(() => expect(listQuestions).toHaveBeenLastCalledWith("c1", { categoryId: "cat1", type: "short_answer", search: "" }));
  });

  it("opens the editor and deletes after confirmation", async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuestionBank courseId="c1" />);
    await screen.findByText("Plants need light.");
    await user.click(screen.getByRole("button", { name: "New question" }));
    expect(screen.getByText("editing new")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete question" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteQuestion).toHaveBeenCalledWith("q1"));
  });
});
