import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PbMock } from "../test/pbMock";
import pb from "../lib/pocketbase";

vi.mock("../lib/pocketbase", async () => ({ default: (await import("../test/pbMock")).makePbMock() }));
const pbMock = pb as unknown as PbMock;

import {
  addQuizQuestion, buildQuestionFilter, getQuizSummary, gradeResponse, listQuizQuestions, saveAnswers, startAttempt, submitAttempt,
} from "./quizzes";
import type { Quiz } from "../lib/types-phase2";

describe("quiz services", () => {
  beforeEach(() => {
    pbMock.send.mockReset();
    Object.values(pbMock.collections).forEach((c) => Object.values(c).forEach((fn) => fn.mockClear()));
  });

  it("builds question bank filters scoped to the course", () => {
    expect(buildQuestionFilter("c1")).toBe("course = 'c1'");
    expect(buildQuestionFilter("c1", { categoryId: "cat9", type: "true_false", search: "cell" })).toBe("course = 'c1' && category = 'cat9' && type = 'true_false' && prompt ~ 'cell'");
    expect(buildQuestionFilter("c1", { categoryId: "none" })).toBe('course = \'c1\' && category = ""');
  });

  it("lists quiz composition in order with the question expanded", async () => {
    await listQuizQuestions("qz1");
    expect(pbMock.collection).toHaveBeenCalledWith("quiz_questions");
    expect(pbMock.collections.quiz_questions.getFullList).toHaveBeenCalledWith(expect.objectContaining({ filter: "quiz = 'qz1'", sort: "sort_order,created", expand: "question" }));
  });

  it("links a bank question to a quiz in the quiz's course", async () => {
    await addQuizQuestion({ id: "qz1", course: "c1" } as Quiz, "q7", 3);
    expect(pbMock.collections.quiz_questions.create).toHaveBeenCalledWith({ quiz: "qz1", question: "q7", course: "c1", sort_order: 3, points: 0 });
  });

  it("takes quizzes only through the trusted server endpoints", async () => {
    await getQuizSummary("act1");
    await startAttempt("act1");
    await saveAnswers("att1", { q1: ["a"] });
    await submitAttempt("att1", { q1: ["a"], q2: "true" });
    await gradeResponse("resp1", 1.5, "Good");
    const calls = pbMock.send.mock.calls;
    expect(calls[0][0]).toBe("/api/lms/quizzes/act1/summary");
    expect(calls[1]).toEqual(["/api/lms/quizzes/act1/start", expect.objectContaining({ method: "POST" })]);
    expect(calls[2]).toEqual(["/api/lms/quiz-attempts/att1/answer", expect.objectContaining({ method: "POST", body: { answers: { q1: ["a"] } } })]);
    expect(calls[3]).toEqual(["/api/lms/quiz-attempts/att1/submit", expect.objectContaining({ method: "POST", body: { answers: { q1: ["a"], q2: "true" } } })]);
    expect(calls[4]).toEqual(["/api/lms/quiz-responses/resp1/grade", expect.objectContaining({ method: "POST", body: { points: 1.5, feedback: "Good" } })]);
  });
});
