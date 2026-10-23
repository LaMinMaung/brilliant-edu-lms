import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));

import { pageFromPath } from "./CoursePlayer";

describe("course player routing", () => {
  it("maps course URLs to player pages", () => {
    expect(pageFromPath("/learn/courses/c1/play")).toBe("activity");
    expect(pageFromPath("/learn/courses/c1/play/a1")).toBe("activity");
    expect(pageFromPath("/learn/courses/c1/announcements")).toBe("announcements");
    expect(pageFromPath("/learn/courses/c1/discussions")).toBe("discussions");
    expect(pageFromPath("/learn/courses/c1/discussions/t9")).toBe("discussions");
    expect(pageFromPath("/learn/courses/c1/grades")).toBe("grades");
  });
});
