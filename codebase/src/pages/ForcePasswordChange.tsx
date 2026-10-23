import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { AuthLayout, FormError } from "../components/auth/AuthLayout";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";
import { useCurrentUser } from "../hooks/useAuth";
import { errorMessage } from "../lib/errors";
import { changeOwnPassword, login } from "../services/auth";

/** Shown instead of the app when an account must replace an initial/admin-set password. */
export default function ForcePasswordChange() {
  const { user, logout } = useCurrentUser();
  const [pw, setPw] = useState({ old: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.next.length < 10) return setError("Choose a password of at least 10 characters.");
    if (pw.next !== pw.confirm) return setError("New passwords do not match.");
    if (pw.next === pw.old) return setError("The new password must be different from the current one.");
    setBusy(true);
    try {
      await changeOwnPassword(user.id, pw.old, pw.next);
      await login(user.email, pw.next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Your account is using an initial or administrator-assigned password. Choose your own before continuing."
      footer={<button onClick={logout} className="underline underline-offset-2 hover:text-ink">Sign out instead</button>}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormError message={error} />
        <div className="flex items-center gap-2 rounded-md bg-paper-2 px-3 py-2 text-sm text-ink-2"><KeyRound className="size-4" aria-hidden /> Signed in as {user.email}</div>
        <Field label="Current password">{(id) => <Input id={id} type="password" autoComplete="current-password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} />}</Field>
        <Field label="New password" hint="At least 10 characters.">{(id) => <Input id={id} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />}</Field>
        <Field label="Confirm new password">{(id) => <Input id={id} type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />}</Field>
        <Button type="submit" loading={busy} disabled={!pw.old || !pw.next}>Save and continue</Button>
      </form>
    </AuthLayout>
  );
}
