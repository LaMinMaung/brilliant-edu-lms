import { ClipboardCheck, FileText, ListChecks } from "lucide-react";
import type { ActivityType, CompletionMode } from "../../lib/types";

export const ACTIVITY_ICON: Record<ActivityType, typeof FileText> = {
  lesson: FileText,
  quiz: ListChecks,
  assignment: ClipboardCheck,
};

export const ACTIVITY_LABEL: Record<ActivityType, string> = { lesson: "Lesson", quiz: "Quiz", assignment: "Assignment" };

export const MODE_LABEL: Record<CompletionMode, string> = {
  manual: "Manual",
  view: "On view",
  none: "Untracked",
  submit: "On submit",
  pass: "On pass",
};

export const DEFAULT_COMPLETION: Record<ActivityType, CompletionMode> = { lesson: "manual", quiz: "pass", assignment: "submit" };

export const COMPLETION_OPTIONS: Record<ActivityType, { value: CompletionMode; label: string }[]> = {
  lesson: [
    { value: "manual", label: "Student marks it complete" },
    { value: "view", label: "Complete when opened" },
    { value: "none", label: "Not tracked" },
  ],
  quiz: [
    { value: "pass", label: "Complete when the student passes" },
    { value: "submit", label: "Complete when an attempt is submitted" },
    { value: "none", label: "Not tracked" },
  ],
  assignment: [
    { value: "submit", label: "Complete when the student submits" },
    { value: "pass", label: "Complete when graded at or above the pass mark" },
    { value: "none", label: "Not tracked" },
  ],
};
