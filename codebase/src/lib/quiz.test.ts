import { describe, expect, it } from "vitest";
import { countAnswered, describeAnswer, formatClock, isAnswered, remainingMs, toggleChoice, validateQuestion } from "./quiz";
import type { AttemptQuestion } from "./types-phase2";

const mc: AttemptQuestion = { id: "q1", type: "multiple_choice", prompt: "?", points: 2, multiple: false, choices: [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }], answer: null };
const tf: AttemptQuestion = { id: "q2", type: "true_false", prompt: "?", points: 1, multiple: false, choices: [], answer: null };
const sa: AttemptQuestion = { id: "q3", type: "short_answer", prompt: "?", points: 1, multiple: false, choices: [], answer: null };

describe("answer completeness", () => {
  it("detects answered questions per type", () => {
    expect(isAnswered(mc, ["a"])).toBe(true);
    expect(isAnswered(mc, [])).toBe(false);
    expect(isAnswered(tf, "false")).toBe(true);
    expect(isAnswered(tf, "maybe")).toBe(false);
    expect(isAnswered(sa, "   ")).toBe(false);
    expect(isAnswered(sa, "cell")).toBe(true);
    expect(isAnswered(sa, null)).toBe(false);
  });

  it("counts answered questions", () => {
    expect(countAnswered([mc, tf, sa], { q1: ["b"], q2: null, q3: "x" })).toBe(2);
  });
});

describe("timer", () => {
  it("computes remaining time corrected by server clock offset", () => {
    const now = Date.parse("2026-10-12T10:00:00Z");
    expect(remainingMs("2026-10-12 10:05:00.000Z", 0, now)).toBe(300000);
    // Server is 60 s ahead of the browser: one minute less remains.
    expect(remainingMs("2026-10-12 10:05:00.000Z", 60000, now)).toBe(240000);
    expect(remainingMs("2026-10-12 09:00:00.000Z", 0, now)).toBe(0);
    expect(remainingMs("", 0, now)).toBeNull();
  });

  it("formats a countdown", () => {
    expect(formatClock(65000)).toBe("01:05");
    expect(formatClock(3725000)).toBe("1:02:05");
  });
});

describe("choices", () => {
  it("single choice replaces, multiple choice toggles", () => {
    expect(toggleChoice(["a"], "b", false)).toEqual(["b"]);
    expect(toggleChoice(["a"], "b", true)).toEqual(["a", "b"]);
    expect(toggleChoice(["a", "b"], "a", true)).toEqual(["b"]);
  });

  it("describes answers in plain language", () => {
    expect(describeAnswer(mc, ["b"])).toBe("Beta");
    expect(describeAnswer(tf, "true")).toBe("True");
    expect(describeAnswer(sa, null)).toBe("No answer");
  });
});

describe("question validation", () => {
  const base = { prompt: "Q", points: 1, feedback: "", category: "", multiple: false, case_sensitive: false };

  it("requires two choices and a correct answer for multiple choice", () => {
    expect(validateQuestion({ ...base, type: "multiple_choice", choices: [{ id: "a", text: "A" }], answer: ["a"] })).toMatch(/two answer choices/);
    expect(validateQuestion({ ...base, type: "multiple_choice", choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }], answer: [] })).toMatch(/correct/);
    expect(validateQuestion({ ...base, type: "multiple_choice", choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }], answer: ["a", "b"] })).toMatch(/Only one/);
    expect(validateQuestion({ ...base, type: "multiple_choice", multiple: true, choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }], answer: ["a", "b"] })).toBeNull();
  });

  it("validates prompt, points and true/false key", () => {
    expect(validateQuestion({ ...base, prompt: " ", type: "short_answer", choices: null, answer: [] })).toMatch(/question text/);
    expect(validateQuestion({ ...base, points: 0, type: "short_answer", choices: null, answer: [] })).toMatch(/Points/);
    expect(validateQuestion({ ...base, type: "true_false", choices: null, answer: null })).toMatch(/true or false/);
    expect(validateQuestion({ ...base, type: "true_false", choices: null, answer: "false" })).toBeNull();
  });
});
