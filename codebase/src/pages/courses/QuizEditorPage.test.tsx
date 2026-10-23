import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../services/courses", () => ({ getCourse: vi.fn().mockResolvedValue({ id: "c1", title: "Biology" }) }));
vi.mock("../../services/curriculum", () => ({ getActivity: vi.fn().mockResolvedValue({ id: "a1", type: "quiz", title: "Quiz 1", is_published: false }) }));
vi.mock("../../services/quizzes", () => ({ getQuizByActivity: vi.fn().mockResolvedValue({ id: "qz1", course: "c1" }) }));
vi.mock("../../components/activities/ActivityBasicsForm", () => ({ ActivityBasicsForm: () => <p>basics form</p> }));
vi.mock("../../components/quiz/QuizSettingsForm", () => ({ QuizSettingsForm: () => <p>settings form</p> }));
vi.mock("../../components/quiz/QuizQuestionsManager", () => ({ QuizQuestionsManager: () => <p>questions manager</p> }));
vi.mock("../../components/quiz/QuizAttemptsPanel", () => ({ QuizAttemptsPanel: () => <p>attempts panel</p> }));

import QuizEditorPage from "./QuizEditorPage";

describe("QuizEditorPage", () => {
  it("shows setup by default and switches between questions and attempts", async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuizEditorPage />, { route: "/teach/courses/c1/lessons/a1", path: "/teach/courses/:id/lessons/:lessonId" });
    expect(await screen.findByText("basics form")).toBeInTheDocument();
    expect(screen.getByText("settings form")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Preview/ })).toHaveAttribute("href", "/learn/courses/c1/play/a1");
    await user.click(screen.getByRole("tab", { name: "Questions" }));
    expect(screen.getByText("questions manager")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Attempts & grading" }));
    expect(screen.getByText("attempts panel")).toBeInTheDocument();
  });
});
