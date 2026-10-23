import { useEffect, useState } from "react";
import type { Activity, CompletionMode } from "../../lib/types";
import { errorMessage } from "../../lib/errors";
import { updateActivity } from "../../services/curriculum";
import { useToast } from "../../hooks/useToast";
import { RichTextEditor } from "../editor/RichTextEditor";
import { FormError } from "../auth/AuthLayout";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea, Toggle } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { COMPLETION_OPTIONS } from "../curriculum/activityMeta";

/** Title, description, instructions, completion and publishing for quiz/assignment activities. */
export function ActivityBasicsForm({ activity, instructionsLabel, onSaved }: { activity: Activity; instructionsLabel: string; onSaved: (a: Activity) => void }) {
  const toast = useToast();
  const [f, setF] = useState({ title: "", description: "", content: "", completion_mode: "pass" as CompletionMode, is_published: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setF({ title: activity.title, description: activity.description, content: activity.content, completion_mode: activity.completion_mode, is_published: activity.is_published });
  }, [activity]);

  const save = async () => {
    if (!f.title.trim()) return setError("Title is required.");
    setBusy(true);
    setError(null);
    try {
      const saved = await updateActivity(activity.id, { ...f, title: f.title.trim() });
      onSaved(saved);
      toast("Saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Details" actions={<Button size="sm" onClick={save} loading={busy}>Save details</Button>}>
      <div className="flex flex-col gap-5">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
          <Field label="Title" required>{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} />}</Field>
          <Field label="Completion">
            {(id) => (
              <Select id={id} value={f.completion_mode} onChange={(e) => setF({ ...f, completion_mode: e.target.value as CompletionMode })}>
                {COMPLETION_OPTIONS[activity.type].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Short description">{(id) => <Textarea id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} maxLength={1000} />}</Field>
        <Field label={instructionsLabel}>{(id) => <RichTextEditor id={id} value={f.content} onChange={(v) => setF({ ...f, content: v })} placeholder="Instructions shown to students…" />}</Field>
        <Toggle checked={f.is_published} onChange={(v) => setF({ ...f, is_published: v })} label="Published" description="Visible to enrolled students when its section is visible. Save to apply." />
      </div>
    </Panel>
  );
}
