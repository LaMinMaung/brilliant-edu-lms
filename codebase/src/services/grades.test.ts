import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/pocketbase", async () => ({ default: (await import("../test/pbMock")).makePbMock() }));

import { cellLabel, gradebookToCsv } from "./grades";
import type { Gradebook } from "../lib/types-phase2";

const gb: Gradebook = {
  course: { id: "c1", title: "Biology 101" },
  is_staff: true,
  columns: [
    { activity_id: "q", title: "Quiz 1", type: "quiz", published: true, max: 0, due_at: "", passing: 60 },
    { activity_id: "a", title: "Essay, part 1", type: "assignment", published: true, max: 20, due_at: "", passing: 10 },
  ],
  rows: [
    {
      user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com" },
      cells: {
        q: { status: "graded", score: 4, max: 5, percent: 80, passed: true, late: false, needs_grading: false },
        a: { status: "submitted", score: null, max: 20, percent: null, passed: null, late: true, needs_grading: true },
      },
      earned: 4, possible: 5, percent: 80,
    },
    {
      user: { id: "u2", name: "Bob", email: "bob@example.com" },
      cells: {
        q: { status: "none", score: null, max: 0, percent: null, passed: null, late: false, needs_grading: false },
        a: { status: "missing", score: null, max: 20, percent: null, passed: null, late: false, needs_grading: false },
      },
      earned: 0, possible: 0, percent: null,
    },
  ],
};

describe("gradebook helpers", () => {
  it("labels cells by status", () => {
    expect(cellLabel(gb.rows[0], gb.columns[0])).toBe("80%");
    expect(cellLabel(gb.rows[0], gb.columns[1])).toBe("To grade");
    expect(cellLabel(gb.rows[1], gb.columns[1])).toBe("Missing");
    expect(cellLabel(gb.rows[1], gb.columns[0])).toBe("—");
  });

  it("exports CSV with escaped titles and totals", () => {
    const lines = gradebookToCsv(gb).split("\n");
    expect(lines[0]).toBe('Learner,Email,Quiz 1 (quiz),"Essay, part 1 (assignment)",Total earned,Total possible,Total %');
    expect(lines[1]).toBe("Ada Lovelace,ada@example.com,80,,4,5,80");
    expect(lines[2]).toBe("Bob,bob@example.com,,missing,0,0,");
  });
});
