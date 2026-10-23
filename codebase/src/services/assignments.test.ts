import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PbMock } from "../test/pbMock";
import pb from "../lib/pocketbase";

vi.mock("../lib/pocketbase", async () => ({ default: (await import("../test/pbMock")).makePbMock() }));
const pbMock = pb as unknown as PbMock;

import { gradeSubmission, listMySubmissions, listSubmissions, submitAssignment, validateSubmissionFiles } from "./assignments";

const file = (name: string, size = 10) => new File(["x".repeat(size)], name);

describe("assignment services", () => {
  beforeEach(() => {
    pbMock.send.mockReset();
    Object.values(pbMock.collections).forEach((c) => Object.values(c).forEach((fn) => fn.mockClear()));
  });

  it("validates file count, extension and size before upload", () => {
    const asg = { allowed_extensions: "pdf, docx", max_file_mb: 1, max_files: 2 };
    expect(validateSubmissionFiles(asg, [file("a.pdf")])).toBeNull();
    expect(validateSubmissionFiles(asg, [file("a.exe")])).toMatch(/not an allowed file type/);
    expect(validateSubmissionFiles(asg, [file("a.pdf"), file("b.pdf"), file("c.pdf")])).toMatch(/at most 2/);
    expect(validateSubmissionFiles(asg, [file("big.pdf", 2 * 1024 * 1024)])).toMatch(/larger than 1 MB/);
    expect(validateSubmissionFiles({ allowed_extensions: "", max_file_mb: 5, max_files: 3 }, [file("notes.TXT")])).toBeNull();
  });

  it("submits through the server endpoint as multipart form data", async () => {
    await submitAssignment("act9", "My essay", [file("essay.pdf"), file("fig.png")]);
    const [path, opts] = pbMock.send.mock.calls[0];
    expect(path).toBe("/api/lms/assignments/act9/submit");
    expect(opts.method).toBe("POST");
    const fd = opts.body as FormData;
    expect(fd.get("text")).toBe("My essay");
    expect((fd.getAll("files") as File[]).map((f) => f.name)).toEqual(["essay.pdf", "fig.png"]);
  });

  it("grades through the staff endpoint", async () => {
    await gradeSubmission("s1", 17, "Well argued");
    expect(pbMock.send).toHaveBeenCalledWith("/api/lms/submissions/s1/grade", expect.objectContaining({ method: "POST", body: { grade: 17, feedback: "Well argued" } }));
  });

  it("scopes submission queries", async () => {
    await listMySubmissions("asg1", "u5");
    expect(pbMock.collections.submissions.getFullList).toHaveBeenCalledWith(expect.objectContaining({ filter: "assignment = 'asg1' && user = 'u5'", sort: "-number" }));
    await listSubmissions("asg1");
    expect(pbMock.collections.submissions.getFullList).toHaveBeenLastCalledWith(expect.objectContaining({ filter: "assignment = 'asg1'", expand: "user" }));
  });
});
