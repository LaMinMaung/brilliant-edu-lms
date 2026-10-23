import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthLayout, FormError } from "../../components/auth/AuthLayout";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { errorMessage } from "../../lib/errors";
import { confirmPasswordReset } from "../../services/auth";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, "This reset link is invalid or has expired."));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="This password reset link is missing its token.">
        <ButtonLink to="/forgot-password" variant="secondary">Request a new link</ButtonLink>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={done ? "Password updated" : "Choose a new password"}
      footer={<Link to="/login" className="font-medium text-ink underline underline-offset-2">Back to sign in</Link>}
    >
      {done ? (
        <ButtonLink to="/login" className="w-full">Sign in with your new password</ButtonLink>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FormError message={error} />
          <Field label="New password" hint="At least 8 characters.">
            {(id) => <Input id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          <Field label="Confirm new password">
            {(id) => <Input id={id} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          </Field>
          <Button type="submit" loading={busy} disabled={!password || !confirm}>Update password</Button>
        </form>
      )}
    </AuthLayout>
  );
}
