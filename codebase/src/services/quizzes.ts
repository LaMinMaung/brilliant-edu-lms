import pb from "../lib/pocketbase";
import type {
  AnswerValue, AttemptPayload, Question, QuestionCategory, QuestionType, Quiz, QuizAttemptRecord, QuizQuestion, QuizSummary,
} from "../lib/types-phase2";

// ---------------- Question bank (course staff only; enforced by access rules) ----------------

export const listQuestionCategories = (courseId: string) =>
  pb.collection("question_categories").getFullList<QuestionCategory>({
    filter: pb.filter("course = {:c}", { c: courseId }),
    sort: "sort_order,name",
    requestKey: null,
  });

export const createQuestionCategory = (courseId: string, name: string, sort_order = 0) =>
  pb.collection("question_categories").create<QuestionCategory>({ course: courseId, name, sort_order });
export const renameQuestionCategory = (id: string, name: string) => pb.collection("question_categories").update<QuestionCategory>(id, { name });
export const deleteQuestionCategory = (id: string) => pb.collection("question_categories").delete(id);

export interface QuestionFilters {
  categoryId?: string;
  type?: QuestionType | "";
  search?: string;
}

export function buildQuestionFilter(courseId: string, { categoryId, type, search }: QuestionFilters = {}) {
  const parts = [pb.filter("course = {:c}", { c: courseId })];
  if (categoryId === "none") parts.push('category = ""');
  else if (categoryId) parts.push(pb.filter("category = {:cat}", { cat: categoryId }));
  if (type) parts.push(pb.filter("type = {:t}", { t: type }));
  if (search) parts.push(pb.filter("prompt ~ {:q}", { q: search }));
  return parts.join(" && ");
}

export const listQuestions = (courseId: string, filters: QuestionFilters = {}) =>
  pb.collection("questions").getFullList<Question>({
    filter: buildQuestionFilter(courseId, filters),
    sort: "-created",
    expand: "category",
    requestKey: null,
  });

export type QuestionInput = Pick<Question, "type" | "prompt" | "choices" | "answer" | "multiple" | "case_sensitive" | "points" | "feedback" | "category">;

export const createQuestion = (courseId: string, userId: string, input: QuestionInput) =>
  pb.collection("questions").create<Question>({ ...input, course: courseId, created_by: userId });
export const updateQuestion = (id: string, input: Partial<QuestionInput>) => pb.collection("questions").update<Question>(id, input);
export const deleteQuestion = (id: string) => pb.collection("questions").delete(id);

// ---------------- Quiz settings & composition ----------------

export const getQuizByActivity = (activityId: string) =>
  pb.collection("quizzes").getFirstListItem<Quiz>(pb.filter("activity = {:a}", { a: activityId }), { requestKey: null });

export const updateQuiz = (id: string, data: Partial<Quiz>) => pb.collection("quizzes").update<Quiz>(id, data);

export const listQuizQuestions = (quizId: string) =>
  pb.collection("quiz_questions").getFullList<QuizQuestion>({
    filter: pb.filter("quiz = {:q}", { q: quizId }),
    sort: "sort_order,created",
    expand: "question",
    requestKey: null,
  });

export const addQuizQuestion = (quiz: Quiz, questionId: string, sort_order: number) =>
  pb.collection("quiz_questions").create<QuizQuestion>({ quiz: quiz.id, question: questionId, course: quiz.course, sort_order, points: 0 });
export const setQuizQuestionPoints = (id: string, points: number) => pb.collection("quiz_questions").update<QuizQuestion>(id, { points });
export const removeQuizQuestion = (id: string) => pb.collection("quiz_questions").delete(id);
export const reorderQuizQuestions = (ids: string[]) =>
  Promise.all(ids.map((id, i) => pb.collection("quiz_questions").update(id, { sort_order: i })));

export const listQuizAttempts = (quizId: string) =>
  pb.collection("quiz_attempts").getFullList<QuizAttemptRecord>({
    filter: pb.filter("quiz = {:q}", { q: quizId }),
    sort: "-created",
    expand: "user",
    requestKey: null,
  });

// ---------------- Taking quizzes (trusted server endpoints) ----------------

export const getQuizSummary = (activityId: string) =>
  pb.send<QuizSummary>(`/api/lms/quizzes/${activityId}/summary`, { requestKey: null });

export const startAttempt = (activityId: string) =>
  pb.send<AttemptPayload>(`/api/lms/quizzes/${activityId}/start`, { method: "POST", requestKey: null });

export const getAttempt = (attemptId: string) =>
  pb.send<AttemptPayload>(`/api/lms/quiz-attempts/${attemptId}`, { requestKey: null });

export const saveAnswers = (attemptId: string, answers: Record<string, AnswerValue>) =>
  pb.send<{ saved: number; server_time: string }>(`/api/lms/quiz-attempts/${attemptId}/answer`, {
    method: "POST",
    body: { answers },
    requestKey: `save-${attemptId}`,
  });

export const submitAttempt = (attemptId: string, answers: Record<string, AnswerValue>) =>
  pb.send<AttemptPayload>(`/api/lms/quiz-attempts/${attemptId}/submit`, { method: "POST", body: { answers }, requestKey: null });

export const gradeResponse = (responseId: string, points: number, feedback: string) =>
  pb.send<AttemptPayload>(`/api/lms/quiz-responses/${responseId}/grade`, { method: "POST", body: { points, feedback } });
