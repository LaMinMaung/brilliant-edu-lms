import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, testUser } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useAuth", async () => {
  const { testUser: u } = await import("../../test/utils");
  return { useCurrentUser: () => ({ user: u, can: () => true }) };
});
vi.mock("../../services/quizzes", () => ({ createQuestion: vi.fn(), updateQuestion: vi.fn() }));

import { createQuestion } from "../../services/quizzes";
import { QuestionModal } from "./QuestionModal";

describe("QuestionModal", () => {
  beforeEach(() => vi.mocked(createQuestion).mockReset().mockResolvedValue({ id: "new" } as never));

  it("blocks saving a multiple-choice question without a correct choice", async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuestionModal open onClose={vi.fn()} courseId="c1" categories={[]} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText(/^Question/), "Which organelle makes energy?");
    await user.type(screen.getByLabelText("Choice 1"), "Nucleus");
    await user.type(screen.getByLabelText("Choice 2"), "Mitochondria");
    await user.click(screen.getByRole("button", { name: "Add question" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Mark at least one choice as correct.");
    expect(createQuestion).not.toHaveBeenCalled();
  });

  it("saves a valid multiple-choice question to the course bank", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderWithRouter(<QuestionModal open onClose={vi.fn()} courseId="c1" categories={[{ id: "cat1", name: "Biology" } as never]} onSaved={onSaved} />);
    await user.type(screen.getByLabelText(/^Question/), "Which organelle makes energy?");
    await user.type(screen.getByLabelText("Choice 1"), "Nucleus");
    await user.type(screen.getByLabelText("Choice 2"), "Mitochondria");
    await user.click(screen.getByLabelText("Choice 2 is correct"));
    await user.selectOptions(screen.getByLabelText("Category"), "cat1");
    await user.click(screen.getByRole("button", { name: "Add question" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [course, userId, input] = vi.mocked(createQuestion).mock.calls[0];
    expect(course).toBe("c1");
    expect(userId).toBe(testUser.id);
    expect(input.type).toBe("multiple_choice");
    expect(input.category).toBe("cat1");
    expect(input.choices!.map((c) => c.text)).toEqual(["Nucleus", "Mitochondria"]);
    expect(input.answer).toEqual([input.choices![1].id]);
  });

  it("stores accepted short answers one per line", async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuestionModal open onClose={vi.fn()} courseId="c1" categories={[]} onSaved={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText("Type"), "short_answer");
    await user.type(screen.getByLabelText(/^Question/), "Name the process.");
    await user.type(screen.getByLabelText("Accepted answers"), "photosynthesis{enter}photo-synthesis");
    await user.click(screen.getByRole("button", { name: "Add question" }));
    await waitFor(() => expect(createQuestion).toHaveBeenCalled());
    expect(vi.mocked(createQuestion).mock.calls[0][2]).toMatchObject({ type: "short_answer", answer: ["photosynthesis", "photo-synthesis"], choices: null });
  });
});
