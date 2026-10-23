import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../test/utils";
import type { PbMock } from "../../test/pbMock";
import pb from "../../lib/pocketbase";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("./LessonEditorPage", () => ({ default: () => <p>lesson editor</p> }));
vi.mock("./QuizEditorPage", () => ({ default: () => <p>quiz editor</p> }));
vi.mock("./AssignmentEditorPage", () => ({ default: () => <p>assignment editor</p> }));

import ActivityEditorPage from "./ActivityEditorPage";

const pbMock = pb as unknown as PbMock;
const route = { route: "/teach/courses/c1/lessons/a1", path: "/teach/courses/:id/lessons/:lessonId" };

describe("ActivityEditorPage", () => {
  it.each([["quiz", "quiz editor"], ["assignment", "assignment editor"], ["lesson", "lesson editor"]])("opens the %s editor", async (type, text) => {
    pbMock.collection("activities").getOne.mockResolvedValueOnce({ id: "a1", type });
    renderWithRouter(<ActivityEditorPage />, route);
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(pbMock.collection("activities").getOne).toHaveBeenLastCalledWith("a1", expect.objectContaining({ fields: "id,type" }));
  });
});
