import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";
import type { Submission } from "../../lib/types-phase2";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../../services/files", () => ({ protectedFileUrl: vi.fn().mockResolvedValue("https://files.test/essay.pdf?token=t") }));

import { protectedFileUrl } from "../../services/files";
import { SubmissionContent } from "./SubmissionContent";

const sub = { id: "s1", number: 2, text: "My essay text", files: ["essay_abc123.pdf"], file_meta: [{ name: "essay.pdf", size: 2048 }], submitted_at: "2026-10-12 10:00:00.000Z", is_late: true, status: "graded", grade: 15, feedback: "Good structure." } as unknown as Submission;

describe("SubmissionContent", () => {
  it("shows text, original file names, late flag, grade and feedback", () => {
    renderWithRouter(<SubmissionContent sub={sub} />);
    expect(screen.getByText("My essay text")).toBeInTheDocument();
    expect(screen.getByText("essay.pdf")).toBeInTheDocument();
    expect(screen.getByText("Late")).toBeInTheDocument();
    expect(screen.getByText("Grade: 15")).toBeInTheDocument();
    expect(screen.getByText("Good structure.")).toBeInTheDocument();
  });

  it("hides the grade when asked (grading screen)", () => {
    renderWithRouter(<SubmissionContent sub={sub} showGrade={false} />);
    expect(screen.queryByText("Grade: 15")).not.toBeInTheDocument();
  });

  it("opens private files through a short-lived token", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue({ opener: null, location: { href: "" } } as unknown as Window);
    const user = userEvent.setup();
    renderWithRouter(<SubmissionContent sub={sub} />);
    await user.click(screen.getByText("essay.pdf"));
    await waitFor(() => expect(protectedFileUrl).toHaveBeenCalledWith(sub, "essay_abc123.pdf"));
    open.mockRestore();
  });
});
