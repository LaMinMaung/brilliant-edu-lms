import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { AuthLayout, FormError } from "../../components/auth/AuthLayout";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { useAuth } from "../../hooks/useAuth";
import { useSettings } from "../../hooks/useSettings";
import { errorMessage } from "../../lib/errors";
import { register, requestVerification } from "../../services/auth";

export default function Register() {
  const { login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  if (settings && !settings.allow_registration) {
    return (
      <AuthLayout title="Registration closed" subtitle="New accounts are created by an administrator.">
        <ButtonLink to="/login" variant="secondary">Back to sign in</ButtonLink>
      </AuthLayout>
    );
  }

  if (awaitingVerify) {
    return (
      <AuthLayout title="Check your inbox" subtitle={<>We sent a verification link to <strong>{form.email}</strong>. Verify your email, then sign in.</>}>
        <div className="flex items-center gap-3 rounded-md border border-rule bg-paper-2 p-4 text-sm text-ink-2">
          <MailCheck className="size-5 text-moss" aria-hidden /> Didn't get it? Check spam, or request a new link after signing in fails.
        </div>
        <ButtonLink to="/login" className="mt-6 w-full">Go to sign in</ButtonLink>
      </AuthLayout>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const { confirm: _confirm, ...input } = form;
      void _confirm;
      await register(input);
      await requestVerification(input.email).catch((err) => console.error("Verification email failed", err));
      if (settings?.require_email_verification) {
        setAwaitingVerify(true);
        return;
      }
      await login(input.email, input.password);
      navigate("/learn", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Student accounts can browse the catalog and enroll in open courses."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-ink underline underline-offset-2">Sign in</Link></>}
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormError message={error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required>{(id) => <Input id={id} autoComplete="given-name" value={form.first_name} onChange={set("first_name")} />}</Field>
          <Field label="Last name" required>{(id) => <Input id={id} autoComplete="family-name" value={form.last_name} onChange={set("last_name")} />}</Field>
        </div>
        <Field label="Email" required>{(id) => <Input id={id} type="email" autoComplete="email" value={form.email} onChange={set("email")} />}</Field>
        <Field label="Password" required hint="At least 8 characters.">
          {(id) => <Input id={id} type="password" autoComplete="new-password" value={form.password} onChange={set("password")} />}
        </Field>
        <Field label="Confirm password" required>
          {(id) => <Input id={id} type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />}
        </Field>
        <Button type="submit" loading={busy} disabled={!form.first_name || !form.last_name || !form.email || !form.password}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
