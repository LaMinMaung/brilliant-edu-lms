import { useParams } from "react-router-dom";
import { ErrorState, Loading } from "../../components/ui/States";
import { useLoader } from "../../hooks/useLoader";
import pb from "../../lib/pocketbase";
import type { Activity } from "../../lib/types";
import LessonEditorPage from "./LessonEditorPage";
import QuizEditorPage from "./QuizEditorPage";
import AssignmentEditorPage from "./AssignmentEditorPage";

/** One route for every activity; opens the editor that matches its type. */
export default function ActivityEditorPage() {
  const { lessonId = "" } = useParams();
  const data = useLoader(
    () => pb.collection("activities").getOne<Activity>(lessonId, { fields: "id,type", requestKey: null }),
    [lessonId],
  );
  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading />;
  if (data.data.type === "quiz") return <QuizEditorPage />;
  if (data.data.type === "assignment") return <AssignmentEditorPage />;
  return <LessonEditorPage />;
}
