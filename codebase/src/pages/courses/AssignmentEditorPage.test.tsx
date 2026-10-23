import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../services/courses", () => ({ getCourse: vi.fn().mockResolvedValue({ id: "c1", title: "Biology" }) }));
vi.mock("../../services/curriculum", () => ({ getActivity: vi.fn().mockResolvedValue({ id: "a1", type: "assignment", title: "Essay 1", is_published: true }) }));
vi.mock("../../services/assignments", () => ({ getAssignmentByActivity: vi.fn().mockResolvedValue({ id: "asg1", max_marks: 20, due_at: "" }) }));
vi.mock("../../components/activities/ActivityBasicsForm", () => ({ ActivityBasicsForm: () => <p>basics form</p> }));
vi.mock("../../components/assignment/AssignmentSettingsForm", () => ({ AssignmentSettingsForm: () => <p>assignment settings</p> }));
vi.mock("../../components/assignment/SubmissionsPanel", () => ({ SubmissionsPanel: () => <p>submissions panel</p> }));
vi.mock("../../components/materials/MaterialsManager", () => ({ MaterialsManager: () => <p>materials</p> }));

import AssignmentEditorPage from "./AssignmentEditorPage";

describe("AssignmentEditorPage", () => {
  it("shows setup (with resources) and the submissions tab", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AssignmentEditorPage />, { route: "/teach/courses/c1/lessons/a1", path: "/teach/courses/:id/lessons/:lessonId" });
    expect(await screen.findByText("assignment settings")).toBeInTheDocument();
    expect(screen.getByText("materials")).toBeInTheDocument();
    expect(screen.getByText(/No due date · 20 marks/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Submissions & grading" }));
    expect(screen.getByText("submissions panel")).toBeInTheDocument();
  });
});
