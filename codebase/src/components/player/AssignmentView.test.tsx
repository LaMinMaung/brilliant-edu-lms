import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";
import type { Activity } from "../../lib/types";
import type { Assignment, Submission } from "../../lib/types-phase2";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../services/curriculum", () => ({ getActivity: vi.fn(), listMaterials: vi.fn().mockResolvedValue([]) }));
vi.mock("../../services/progress", () => ({ recordAccess: vi.fn().mockResolvedValue({ id: "p1" }) }));
vi.mock("../../services/assignments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/assignments")>()),
  getAssignmentByActivity: vi.fn(),
  listMySubmissions: vi.fn(),
  submitAssignment: vi.fn(),
}));

import { getActivity } from "../../services/curriculum";
import { getAssignmentByActivity, listMySubmissions, submitAssignment } from "../../services/assignments";
import { AssignmentView } from "./AssignmentView";

const activity = { id: "act1", course: "c1", type: "assignment", title: "Essay", content: "<p>Write about cells</p>", description: "" } as Activity;
const future = new Date(Date.now() + 3 * 86400000).toISOString().replace("T", " ");
const past = new Date(Date.now() - 86400000).toISOString().replace("T", " ");
const asg = (over: Partial<Assignment> = {}) => ({ id: "asg1", activity: "act1", course: "c1", due_at: future, cutoff_at: "", allow_late: true, max_marks: 20, pass_marks: 10, submission_type: "text", allowed_extensions: "", max_file_mb: 5, max_files: 1, max_submissions: 0, ...over } as Assignment);

const view = (mode: "learner" | "preview" = "learner", onDone = vi.fn()) =>
  renderWithRouter(<AssignmentView courseId="c1" userId="u1" activity={activity} mode={mode} onProgress={vi.fn()} onCompletionMaybeChanged={onDone} />);

describe("AssignmentView", () => {
  beforeEach(() => {
    vi.mocked(getActivity).mockResolvedValue(activity);
    vi.mocked(listMySubmissions).mockResolvedValue([]);
    vi.mocked(submitAssignment).mockReset().mockResolvedValue({ id: "s1" } as Submission);
  });

  it("requires text for a text assignment, then submits after confirmation", async () => {
    vi.mocked(getAssignmentByActivity).mockResolvedValue(asg());
    const onDone = vi.fn();
    const user = userEvent.setup();
    view("learner", onDone);
    expect(await screen.findByText("Write about cells")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter your answer.");
    await user.type(screen.getByLabelText("Submission text"), "Cells are the unit of life.");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(submitAssignment).toHaveBeenCalledWith("act1", "Cells are the unit of life.", []));
    expect(onDone).toHaveBeenCalled();
  });

  it("shows the latest grade and feedback", async () => {
    vi.mocked(getAssignmentByActivity).mockResolvedValue(asg());
    vi.mocked(listMySubmissions).mockResolvedValue([{ id: "s2", number: 2, text: "Revised", files: [], file_meta: [], submitted_at: past, is_late: false, status: "graded", grade: 15, feedback: "Add sources." } as unknown as Submission]);
    view();
    expect(await screen.findByText("Grade: 15")).toBeInTheDocument();
    expect(screen.getByText("Add sources.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resubmit" })).toBeInTheDocument();
  });

  it("closes submissions after the due date when late work isn't accepted", async () => {
    vi.mocked(getAssignmentByActivity).mockResolvedValue(asg({ due_at: past, allow_late: false }));
    view();
    expect(await screen.findByText("Submissions for this assignment are closed.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Submission text")).not.toBeInTheDocument();
  });

  it("enforces the submission limit", async () => {
    vi.mocked(getAssignmentByActivity).mockResolvedValue(asg({ max_submissions: 1 }));
    vi.mocked(listMySubmissions).mockResolvedValue([{ id: "s1", number: 1, text: "x", files: [], submitted_at: past, status: "submitted" } as unknown as Submission]);
    view();
    expect(await screen.findByText("You have used all your submissions for this assignment.")).toBeInTheDocument();
  });

  it("does not offer submission in staff preview", async () => {
    vi.mocked(getAssignmentByActivity).mockResolvedValue(asg());
    view("preview");
    expect(await screen.findByText(/Preview mode/)).toBeInTheDocument();
    expect(listMySubmissions).not.toHaveBeenCalledWith("asg1", "u1");
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });
});
