import { useEffect, useState, type FormEvent } from "react";
import { Wand2 } from "lucide-react";
import type { Role, User } from "../../lib/types";
import { errorMessage } from "../../lib/errors";
import { createUser, updateUser } from "../../services/users";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea, Toggle } from "../ui/Field";
import { FormError } from "../auth/AuthLayout";

interface Props {
  open: boolean;
  onClose: () => void;
  roles: Role[];
  user?: User | null;
  isSelf?: boolean;
  onSaved: (u: User) => void;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#%+";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

const empty = { first_name: "", last_name: "", email: "", role: "", status: "active" as "active" | "inactive", headline: "", phone: "", bio: "", password: "" };

export function UserFormModal({ open, onClose, roles, user, isSelf, onSaved }: Props) {
  const [f, setF] = useState(empty);
  const [forceChange, setForceChange] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(
      user
        ? { first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, status: user.status, headline: user.headline, phone: user.phone, bio: user.bio, password: "" }
        : { ...empty, role: roles.find((r) => r.slug === "student")?.id || "" },
    );
  }, [open, user, roles]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user && f.password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    try {
      const { password, ...rest } = f;
      const saved = user
        ? await updateUser(user.id, isSelf ? { first_name: rest.first_name, last_name: rest.last_name, email: rest.email, headline: rest.headline, phone: rest.phone, bio: rest.bio } : rest)
        : await createUser({ ...rest, password, must_change_password: forceChange });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={user ? "Edit user" : "Create user"}
      description={user ? undefined : "The account is created as verified and can sign in immediately."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="user-form" loading={busy}>{user ? "Save changes" : "Create user"}</Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><FormError message={error} /></div>
        <Field label="First name" required>{(id) => <Input id={id} value={f.first_name} onChange={set("first_name")} required />}</Field>
        <Field label="Last name" required>{(id) => <Input id={id} value={f.last_name} onChange={set("last_name")} required />}</Field>
        <Field label="Email" required className="sm:col-span-2">{(id) => <Input id={id} type="email" value={f.email} onChange={set("email")} required />}</Field>
        <Field label="Role" required hint={isSelf ? "You can't change your own role." : undefined}>
          {(id) => (
            <Select id={id} value={f.role} onChange={set("role")} disabled={isSelf} required>
              <option value="" disabled>Select a role</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Account status" hint={isSelf ? "You can't deactivate yourself." : "Inactive users cannot sign in."}>
          {(id) => (
            <Select id={id} value={f.status} onChange={set("status")} disabled={isSelf}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          )}
        </Field>
        <Field label="Headline">{(id) => <Input id={id} value={f.headline} onChange={set("headline")} maxLength={160} placeholder="e.g. Mathematics teacher" />}</Field>
        <Field label="Phone">{(id) => <Input id={id} value={f.phone} onChange={set("phone")} maxLength={40} />}</Field>
        <Field label="Bio" className="sm:col-span-2">{(id) => <Textarea id={id} value={f.bio} onChange={set("bio")} maxLength={2000} rows={3} />}</Field>
        {!user && (
          <Field label="Initial password" required className="sm:col-span-2" hint="Share it securely; the user can change it from their profile.">
            {(id) => (
              <div className="flex gap-2">
                <Input id={id} value={f.password} onChange={set("password")} className="font-mono" autoComplete="new-password" />
                <Button type="button" variant="secondary" icon={<Wand2 className="size-4" />} onClick={() => setF({ ...f, password: generatePassword() })}>Generate</Button>
              </div>
            )}
          </Field>
        )}
        {!user && (
          <div className="sm:col-span-2">
            <Toggle checked={forceChange} onChange={setForceChange} label="Require password change at first sign-in" description="Recommended. The user must replace this initial password before using the LMS." />
          </div>
        )}
      </form>
    </Modal>
  );
}
