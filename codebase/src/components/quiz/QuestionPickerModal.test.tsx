import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../services/quizzes", () => ({
  listQuestions: vi.fn().mockResolvedValue([
    { id: "q1", type: "true_false", prompt: "Already in quiz", points: 1 },
    { id: "q2", type: "short_answer", prompt: "Name the process.", points: 2 },
    { id: "q3", type: "multiple_choice", prompt: "Pick one.", points: 1 },
  ]),
}));

import { QuestionPickerModal } from "./QuestionPickerModal";

describe("QuestionPickerModal", () => {
  it("hides questions already in the quiz and adds the selected ones", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn().mockResolvedValue(undefined);
    renderWithRouter(<QuestionPickerModal open onClose={vi.fn()} courseId="c1" categories={[]} excludeIds={["q1"]} onPick={onPick} />);
    expect(await screen.findByText("Name the process.")).toBeInTheDocument();
    expect(screen.queryByText("Already in quiz")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add/ })).toBeDisabled();
    await user.click(screen.getByText("Name the process."));
    await user.click(screen.getByRole("button", { name: "Add 1 question" }));
    await waitFor(() => expect(onPick).toHaveBeenCalled());
    expect(onPick.mock.calls[0][0].map((q: { id: string }) => q.id)).toEqual(["q2"]);
  });
});
