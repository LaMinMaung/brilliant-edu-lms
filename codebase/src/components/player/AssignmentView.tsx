import { useEffect, useRef, useState } from "react";
import { CalendarClock, FileUp, Paperclip, X } from "lucide-react";
import type { Activity, ActivityProgress } from "../../lib/types";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { dueLabel, formatBytes, formatDateTime, isPast } from "../../lib/format";
import { getActivity, listMaterials } from "../../services/curriculum";
import { getAssignmentByActivity, listMySubmissions, submitAssignment, validateSubmissionFiles } from "../../services/assignments";
import { recordAccess } from "../../services/progress";
import { RichText } from "../editor/RichText";
import { MaterialItem } from "../materials/MaterialItem";
import { SubmissionContent } from "../assignment/SubmissionContent";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Field";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ErrorState, Loading } from "../ui/States";
import { FormError } from "../auth/AuthLayout";

interface Props {
  courseId: string;
  userId: string;
  activity: Activity;
  mode: "learner" | "preview";
  progress?: ActivityProgress;
  onProgress: (p: ActivityProgress) => void;
  onCompletionMaybeChanged: () => void;
}

export function AssignmentView({ courseId, userId, activity, mode, progress, onProgress, onCompletionMaybeChanged }: Props) {
  const toast = useToast();
  const data = useLoader(async () => {
    const [full, asg, materials] = await Promise.all([getActivity(activity.id), getAssignmentByActivity(activity.id), listMaterials(activity.id)]);
    const subs = mode === "learner" ? await listMySubmissions(asg.id, userId) : [];
    return { full, asg, materials, subs };
  }, [activity.id, mode, userId]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const accessed = useRef(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode !== "learner" || accessed.current) return;
    accessed.current = true;
    recordAccess(progressRef.current, { userId, courseId, activityId: activity.id, autoComplete: false })
      .then(onProgress)
      .catch((err) => console.error("Failed to record access", err));
  }, [mode, userId, courseId, activity.id, onProgress]);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading label="Loading assignment" />;
  const { full, asg, materials, subs } = data.data;
  const latest = subs[0];
  const pastDue = isPast(asg.due_at);
  const closed = isPast(asg.cutoff_at) || (pastDue && !asg.allow_late);
  const limitReached = asg.max_submissions > 0 && subs.length >= asg.max_submissions;
  const allowText = asg.submission_type !== "file";
  const allowFiles = asg.submission_type !== "text";
  const canSubmit = mode === "learner" && !closed && !limitReached;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list)];
    const problem = validateSubmissionFiles(asg, next);
    setError(problem);
    if (!problem) setFiles(next);
  };

  const validate = () => {
    if (asg.submission_type === "text" && !text.trim()) return "Please enter your answer.";
    if (asg.submission_type === "file" && !files.length) return "Please attach at least one file.";
    if (asg.submission_type === "text_and_file" && !text.trim() && !files.length) return "Add text or attach at least one file.";
    return validateSubmissionFiles(asg, files);
  };

  const submit = async () => {
    setBusy(true);
    try {
      await submitAssignment(activity.id, text.trim(), files);
      toast(latest ? "Resubmitted. Your instructor has been notified." : "Submitted. Your instructor has been notified.");
      setText("");
      setFiles([]);
      data.reload();
      onCompletionMaybeChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-paper-2 p-4 text-sm">
        <CalendarClock className="size-4 text-ink-3" aria-hidden />
        <span><strong>{asg.due_at ? formatDateTime(asg.due_at) : "No due date"}</strong>{asg.due_at && <span className="text-ink-3"> · {dueLabel(asg.due_at)}</span>}</span>
        <span className="text-ink-3">· {asg.max_marks} marks</span>
        {asg.max_submissions > 0 && <span className="text-ink-3">· {asg.max_submissions} submission{asg.max_submissions === 1 ? "" : "s"} allowed</span>}
        {pastDue && asg.allow_late && !isPast(asg.cutoff_at) && <Badge tone="warning">Late submissions accepted</Badge>}
        {closed && <Badge tone="danger">Closed</Badge>}
      </div>

      {full.content ? <RichText html={full.content} /> : <p className="text-ink-3">No written instructions.</p>}

      {materials.length > 0 && (
        <section aria-labelledby="asg-mat">
          <h2 id="asg-mat" className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><Paperclip className="size-4" aria-hidden /> Resources</h2>
          <ul className="flex flex-col gap-2">{materials.map((m) => <MaterialItem key={m.id} material={m} />)}</ul>
        </section>
      )}

      {mode === "preview" && <p className="rounded-md bg-paper-2 px-3 py-2 text-sm text-ink-2">Preview mode: students submit their work here. Review submissions from the assignment's “Submissions & grading” tab.</p>}

      {latest && (
        <section aria-labelledby="asg-latest" className="rounded-lg border border-rule p-4">
          <h2 id="asg-latest" className="mb-3 font-display text-lg font-semibold">Your {latest.status === "graded" ? "graded " : ""}submission</h2>
          <SubmissionContent sub={latest} />
        </section>
      )}

      {canSubmit ? (
        <section aria-labelledby="asg-form" className="flex flex-col gap-4 rounded-lg border border-rule bg-paper p-5">
          <h2 id="asg-form" className="font-display text-lg font-semibold">{latest ? "Resubmit" : "Submit your work"}</h2>
          {pastDue && <p className="text-sm text-brick">The due date has passed. This submission will be marked late.</p>}
          <FormError message={error} />
          {allowText && <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={20000} placeholder="Write your answer here…" aria-label="Submission text" />}
          {allowFiles && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" size="sm" icon={<FileUp className="size-4" />} onClick={() => fileInput.current?.click()} disabled={files.length >= asg.max_files}>Attach files</Button>
                <span className="text-xs text-ink-3">
                  {asg.allowed_extensions ? asg.allowed_extensions.toUpperCase() : "Documents, images or ZIP"} · up to {asg.max_file_mb} MB each · max {asg.max_files} file{asg.max_files === 1 ? "" : "s"}
                </span>
                <input ref={fileInput} type="file" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                  accept={asg.allowed_extensions ? asg.allowed_extensions.split(/[\s,]+/).filter(Boolean).map((x) => "." + x).join(",") : undefined} />
              </div>
              {files.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-md border border-rule px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="font-mono text-[11px] text-ink-3">{formatBytes(f.size)}</span>
                      <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="rounded p-1 text-ink-3 hover:text-brick" aria-label={`Remove ${f.name}`}><X className="size-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div><Button variant="marker" loading={busy} onClick={() => { const p = validate(); setError(p); if (!p) setConfirm(true); }}>{latest ? "Resubmit" : "Submit"}</Button></div>
        </section>
      ) : mode === "learner" && (
        <p className="rounded-md bg-paper-2 px-3 py-2 text-sm text-ink-2">
          {limitReached ? "You have used all your submissions for this assignment." : "Submissions for this assignment are closed."}
        </p>
      )}

      {subs.length > 1 && (
        <details className="rounded-lg border border-rule p-4">
          <summary className="cursor-pointer text-sm font-medium">Submission history ({subs.length})</summary>
          <div className="mt-4 flex flex-col gap-5">{subs.slice(1).map((s) => <SubmissionContent key={s.id} sub={s} />)}</div>
        </details>
      )}

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} danger={false} confirmLabel={latest ? "Resubmit" : "Submit"}
        title={latest ? "Resubmit this assignment?" : "Submit this assignment?"}
        message={`${files.length ? `${files.length} file${files.length === 1 ? "" : "s"}` : "No files"}${text.trim() ? " and your text" : ""} will be sent to your instructor.${asg.max_submissions ? ` This uses ${subs.length + 1} of ${asg.max_submissions} allowed submissions.` : ""}`}
        onConfirm={submit} />
    </div>
  );
}
