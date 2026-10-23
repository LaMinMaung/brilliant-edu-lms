import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout, FormError } from "../../components/auth/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { errorMessage } from "../../lib/errors";
import { requestPasswordReset } from "../../services/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={sent ? undefined : "Enter your account email and we'll send you a reset link."}
      footer={<Link to="/login" className="font-medium text-ink underline underline-offset-2">Back to sign in</Link>}
    >
      {sent ? (
        <div className="rounded-md border border-moss/25 bg-moss-soft p-4 text-sm text-ink" role="status">
          If an account exists for <strong>{email}</strong>, a reset link is on its way. The link expires after a short time.
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FormError message={error} />
          <Field label="Email">
            {(id) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <Button type="submit" loading={busy} disabled={!email}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
