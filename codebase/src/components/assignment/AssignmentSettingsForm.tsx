import { useEffect, useState } from "react";
import type { Assignment, SubmissionType } from "../../lib/types-phase2";
import { errorMessage } from "../../lib/errors";
import { fromInputDateTime, toInputDateTime } from "../../lib/format";
import { updateAssignment } from "../../services/assignments";
import { useToast } from "../../hooks/useToast";
import { FormError } from "../auth/AuthLayout";
import { Button } from "../ui/Button";
import { Field, Input, Select, Toggle } from "../ui/Field";
import { Panel } from "../ui/Panel";

export function AssignmentSettingsForm({ assignment, onSaved }: { assignment: Assignment; onSaved: (a: Assignment) => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    due_at: "", cutoff_at: "", allow_late: true, max_marks: 100, pass_marks: 0, submission_type: "text_and_file" as SubmissionType,
    allowed_extensions: "", max_file_mb: 10, max_files: 3, max_submissions: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setF({
      due_at: toInputDateTime(assignment.due_at), cutoff_at: toInputDateTime(assignment.cutoff_at), allow_late: assignment.allow_late,
      max_marks: assignment.max_marks || 0, pass_marks: assignment.pass_marks || 0, submission_type: assignment.submission_type || "text_and_file",
      allowed_extensions: assignment.allowed_extensions || "", max_file_mb: assignment.max_file_mb || 10, max_files: assignment.max_files || 1,
      max_submissions: assignment.max_submissions || 0,
    });
  }, [assignment]);

  const save = async () => {
    if (!(f.max_marks > 0)) return setError("Maximum marks must be greater than 0.");
    if (f.pass_marks > f.max_marks) return setError("Pass mark can't exceed maximum marks.");
    if (f.due_at && f.cutoff_at && new Date(f.cutoff_at) < new Date(f.due_at)) return setError("The final cut-off must be after the due date.");
    setBusy(true);
    setError(null);
    try {
      const saved = await updateAssignment(assignment.id, {
        ...f,
        allowed_extensions: f.allowed_extensions.toLowerCase().split(/[\s,;]+/).map((x) => x.replace(/^\./, "")).filter(Boolean).join(", "),
        due_at: fromInputDateTime(f.due_at),
        cutoff_at: fromInputDateTime(f.cutoff_at),
      });
      onSaved(saved);
      toast("Assignment settings saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const num = (k: "max_marks" | "pass_marks" | "max_file_mb" | "max_files" | "max_submissions") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });
  const filesAllowed = f.submission_type !== "text";

  return (
    <Panel title="Submission settings" actions={<Button size="sm" onClick={save} loading={busy}>Save settings</Button>}>
      <div className="flex flex-col gap-5">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Due date">{(id) => <Input id={id} type="datetime-local" value={f.due_at} onChange={(e) => setF({ ...f, due_at: e.target.value })} />}</Field>
          <Field label="Final cut-off" hint="No submissions after this, even late ones. Optional.">{(id) => <Input id={id} type="datetime-local" value={f.cutoff_at} onChange={(e) => setF({ ...f, cutoff_at: e.target.value })} />}</Field>
        </div>
        <Toggle checked={f.allow_late} onChange={(v) => setF({ ...f, allow_late: v })} label="Accept late submissions" description="Late submissions are clearly flagged for grading." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Maximum marks">{(id) => <Input id={id} type="number" min={1} value={f.max_marks} onChange={num("max_marks")} />}</Field>
          <Field label="Pass mark" hint="Used when completion is “on pass”.">{(id) => <Input id={id} type="number" min={0} value={f.pass_marks} onChange={num("pass_marks")} />}</Field>
          <Field label="Submissions allowed" hint="0 = unlimited resubmissions">{(id) => <Input id={id} type="number" min={0} max={100} value={f.max_submissions} onChange={num("max_submissions")} />}</Field>
        </div>
        <Field label="Students submit">
          {(id) => (
            <Select id={id} value={f.submission_type} onChange={(e) => setF({ ...f, submission_type: e.target.value as SubmissionType })}>
              <option value="text_and_file">Text and/or files</option>
              <option value="text">Text only</option>
              <option value="file">Files only</option>
            </Select>
          )}
        </Field>
        {filesAllowed && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Allowed file types" hint="e.g. pdf, docx, png. Empty = all safe document & image types." className="sm:col-span-3">
              {(id) => <Input id={id} value={f.allowed_extensions} onChange={(e) => setF({ ...f, allowed_extensions: e.target.value })} placeholder="pdf, docx" className="font-mono" />}
            </Field>
            <Field label="Max size per file (MB)">{(id) => <Input id={id} type="number" min={1} max={50} value={f.max_file_mb} onChange={num("max_file_mb")} />}</Field>
            <Field label="Max files per submission">{(id) => <Input id={id} type="number" min={1} max={10} value={f.max_files} onChange={num("max_files")} />}</Field>
          </div>
        )}
      </div>
    </Panel>
  );
}
