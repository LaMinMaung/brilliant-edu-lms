import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ClientResponseError } from "pocketbase";
import { AuthLayout, FormError } from "../../components/auth/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { useAuth } from "../../hooks/useAuth";
import { useSettings } from "../../hooks/useSettings";
import { DASHBOARD_HOME } from "../../lib/permissions";
import { errorMessage } from "../../lib/errors";

export default function Login() {
  const { login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      const next = params.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      navigate(safeNext || DASHBOARD_HOME[user.expand?.role?.dashboard || "student"], { replace: true });
    } catch (err) {
      if (err instanceof ClientResponseError && err.status === 400) {
        setError(
          settings?.require_email_verification
            ? "Sign-in failed. Check your credentials, confirm your email is verified, and that your account is active."
            : "Sign-in failed. Check your email and password, or contact an administrator if your account was deactivated.",
        );
      } else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Pick up where you left off."
      footer={
        settings?.allow_registration !== false ? (
          <>New here? <Link to="/register" className="font-medium text-ink underline underline-offset-2">Create a student account</Link></>
        ) : (
          <>Accounts are created by your administrator.</>
        )
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormError message={error} />
        <Field label="Email">
          {(id) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password">
          {(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <div className="-mt-1 text-right">
          <Link to="/forgot-password" className="text-[13px] text-ink-2 underline-offset-2 hover:text-ink hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" loading={busy} disabled={!email || !password}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}
