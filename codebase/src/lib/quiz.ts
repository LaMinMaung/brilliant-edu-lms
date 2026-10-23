import type { AnswerValue, AttemptQuestion, Choice, QuestionInput } from "./quiz-types";

export function isAnswered(q: Pick<AttemptQuestion, "type">, answer: AnswerValue | undefined) {
  if (answer === null || answer === undefined) return false;
  if (q.type === "multiple_choice") return Array.isArray(answer) && answer.length > 0;
  if (q.type === "true_false") return answer === "true" || answer === "false";
  return typeof answer === "string" && answer.trim().length > 0;
}

export function countAnswered(questions: AttemptQuestion[], answers: Record<string, AnswerValue>) {
  return questions.filter((q) => isAnswered(q, answers[q.id])).length;
}

/** Milliseconds left, corrected for the difference between the browser and server clocks. */
export function remainingMs(deadline: string, serverOffsetMs: number, now = Date.now()) {
  if (!deadline) return null;
  const end = new Date(deadline.replace(" ", "T")).getTime();
  if (isNaN(end)) return null;
  return Math.max(0, end - (now + serverOffsetMs));
}

export function formatClock(ms: number) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function toggleChoice(current: AnswerValue, choiceId: string, multiple: boolean): string[] {
  const list = Array.isArray(current) ? current : [];
  if (!multiple) return [choiceId];
  return list.includes(choiceId) ? list.filter((c) => c !== choiceId) : [...list, choiceId];
}

export function newChoiceId() {
  return Math.random().toString(36).slice(2, 8);
}

/** Validates a question before saving. Returns an error message, or null when valid. */
export function validateQuestion(q: QuestionInput): string | null {
  if (!q.prompt.trim()) return "Enter the question text.";
  if (!(q.points > 0)) return "Points must be greater than 0.";
  if (q.type === "multiple_choice") {
    const choices = (q.choices || []).filter((c: Choice) => c.text.trim());
    if (choices.length < 2) return "Add at least two answer choices.";
    const correct = Array.isArray(q.answer) ? q.answer.filter((id) => choices.some((c) => c.id === id)) : [];
    if (!correct.length) return "Mark at least one choice as correct.";
    if (!q.multiple && correct.length > 1) return "Only one choice can be correct unless multiple answers are allowed.";
  }
  if (q.type === "true_false" && q.answer !== "true" && q.answer !== "false") return "Choose whether the statement is true or false.";
  return null;
}

/** Human-readable version of an answer (for results and grading screens). */
export function describeAnswer(q: Pick<AttemptQuestion, "type" | "choices">, answer: AnswerValue | undefined) {
  if (answer === null || answer === undefined || (Array.isArray(answer) && !answer.length) || answer === "") return "No answer";
  if (q.type === "multiple_choice") {
    const ids = Array.isArray(answer) ? answer : [answer];
    return ids.map((id) => q.choices.find((c) => c.id === id)?.text ?? "?").join(", ");
  }
  if (q.type === "true_false") return answer === "true" ? "True" : "False";
  return Array.isArray(answer) ? answer.join(" / ") : answer;
}

export const QUESTION_TYPE_LABEL: Record<string, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True / false",
  short_answer: "Short answer",
  removed: "Removed",
};
