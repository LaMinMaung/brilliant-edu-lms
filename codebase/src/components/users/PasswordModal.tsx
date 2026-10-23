import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { FormError } from "../auth/AuthLayout";
import { errorMessage } from "../../lib/errors";
import { setUserPassword } from "../../services/users";

/** Admin sets a new password directly (signs the user out of all sessions). */
export function PasswordModal({ open, onClose, userId, onDone }: { open: boolean; onClose: () => void; userId: string; onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setPw(""); setError(null); } }, [open]);

  const submit = async () => {
    if (pw.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    try {
      await setUserPassword(userId, pw);
      onDone();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Set a new password" description="The user will be signed out of existing sessions."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Set password</Button></>}>
      <div className="flex flex-col gap-3">
        <FormError message={error} />
        <Field label="New password" hint="At least 8 characters.">
          {(id) => <Input id={id} value={pw} onChange={(e) => setPw(e.target.value)} className="font-mono" autoComplete="new-password" />}
        </Field>
      </div>
    </Modal>
  );
}
