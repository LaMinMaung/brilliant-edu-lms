import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../test/utils";
import type { Activity } from "../../lib/types";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));

import { ActivityShell } from "./ActivityShell";

const a = (id: string, title: string, type: Activity["type"] = "quiz") => ({ id, title, type, description: "" } as Activity);

describe("ActivityShell", () => {
  it("shows position and links to previous and next activities", () => {
    renderWithRouter(
      <ActivityShell courseId="c1" activity={a("q1", "Quiz 1")} sectionTitle="Week 1" position={{ index: 1, total: 3 }} prev={a("l1", "Intro", "lesson")} next={a("as1", "Essay", "assignment")}>
        <p>body</p>
      </ActivityShell>,
    );
    expect(screen.getByText("Week 1 · Quiz · 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Previous\s*Intro/ })).toHaveAttribute("href", "/learn/courses/c1/play/l1");
    expect(screen.getByRole("link", { name: /Next\s*Essay/ })).toHaveAttribute("href", "/learn/courses/c1/play/as1");
  });

  it("offers a way back to the overview at the end of the course", () => {
    renderWithRouter(<ActivityShell courseId="c1" activity={a("q1", "Final quiz")} sectionTitle="Week 9" position={{ index: 2, total: 3 }}><p>body</p></ActivityShell>);
    expect(screen.getByRole("link", { name: /Back to overview/ })).toHaveAttribute("href", "/learn/courses/c1/play");
  });
});
