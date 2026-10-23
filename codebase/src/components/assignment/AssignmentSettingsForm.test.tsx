import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";
import type { Assignment } from "../../lib/types-phase2";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../services/assignments", () => ({ updateAssignment: vi.fn().mockResolvedValue({ id: "asg1" }) }));

import { updateAssignment } from "../../services/assignments";
import { AssignmentSettingsForm } from "./AssignmentSettingsForm";

const asg = { id: "asg1", activity: "a1", course: "c1", due_at: "", cutoff_at: "", allow_late: true, max_marks: 100, pass_marks: 0, submission_type: "text_and_file", allowed_extensions: "", max_file_mb: 10, max_files: 3, max_submissions: 0 } as Assignment;

describe("AssignmentSettingsForm", () => {
  it("rejects a pass mark above the maximum", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AssignmentSettingsForm assignment={asg} onSaved={vi.fn()} />);
    const pass = screen.getByLabelText(/Pass mark/);
    await user.clear(pass);
    await user.type(pass, "150");
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    expect(screen.getByRole("alert")).toHaveTextContent("can't exceed maximum marks");
    expect(updateAssignment).not.toHaveBeenCalled();
  });

  it("normalises allowed file types and saves limits", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AssignmentSettingsForm assignment={asg} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText(/Allowed file types/), ".PDF;docx  png");
    const subs = screen.getByLabelText(/Submissions allowed/);
    await user.clear(subs);
    await user.type(subs, "2");
    await user.click(screen.getByRole("switch", { name: /Accept late submissions/ }));
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    await waitFor(() => expect(updateAssignment).toHaveBeenCalled());
    expect(updateAssignment).toHaveBeenCalledWith("asg1", expect.objectContaining({ allowed_extensions: "pdf, docx, png", max_submissions: 2, allow_late: false, due_at: "", cutoff_at: "" }));
  });

  it("hides file options for text-only assignments", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AssignmentSettingsForm assignment={asg} onSaved={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText("Students submit"), "text");
    expect(screen.queryByLabelText(/Allowed file types/)).not.toBeInTheDocument();
  });
});
