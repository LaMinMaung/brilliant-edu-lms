import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";
import type { Assignment } from "../../lib/types-phase2";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../services/assignments", () => ({
  listSubmissions: vi.fn().mockResolvedValue([
    { id: "s3", user: "u1", number: 1, is_latest: true, is_late: false, status: "graded", grade: 18, submitted_at: "2026-10-12 09:00:00.000Z", expand: { user: { name: "Ada" } } },
    { id: "s2", user: "u2", number: 2, is_latest: true, is_late: true, status: "submitted", grade: 0, submitted_at: "2026-10-12 08:00:00.000Z", expand: { user: { name: "Bob" } } },
    { id: "s1", user: "u2", number: 1, is_latest: false, is_late: false, status: "submitted", grade: 0, submitted_at: "2026-10-10 08:00:00.000Z", expand: { user: { name: "Bob" } } },
  ]),
}));
vi.mock("./GradeSubmissionModal", () => ({ GradeSubmissionModal: ({ submissionId }: { submissionId: string | null }) => (submissionId ? <p>grading {submissionId}</p> : null) }));

import { SubmissionsPanel } from "./SubmissionsPanel";

describe("SubmissionsPanel", () => {
  it("shows one row per student (latest submission) and filters to ungraded", async () => {
    const user = userEvent.setup();
    renderWithRouter(<SubmissionsPanel assignment={{ id: "asg1", max_marks: 20 } as Assignment} />);
    expect(await screen.findByText("2 students submitted · 1 to grade")).toBeInTheDocument();
    expect(screen.getByText("18 / 20")).toBeInTheDocument();
    expect(screen.getAllByText("Bob")).toHaveLength(1);
    await user.selectOptions(screen.getByLabelText("Filter submissions"), "ungraded");
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
    await user.click(screen.getByText("Bob"));
    expect(screen.getByText("grading s2")).toBeInTheDocument();
  });
});
