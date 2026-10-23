import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { ButtonLink } from "../../components/ui/Button";
import { Loading } from "../../components/ui/States";
import { useAuth } from "../../hooks/useAuth";
import { errorMessage } from "../../lib/errors";
import { confirmVerification } from "../../services/auth";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { user, reload } = useAuth();
  const token = params.get("token") || "";
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState("error");
      setError("This verification link is missing its token.");
      return;
    }
    confirmVerification(token)
      .then(async () => {
        setState("done");
        await reload().catch(() => undefined);
      })
      .catch((err) => {
        setState("error");
        setError(errorMessage(err, "This verification link is invalid or has expired."));
      });
  }, [token, reload]);

  if (state === "working") return <Loading label="Verifying your email" />;
  return (
    <AuthLayout
      title={state === "done" ? "Email verified" : "Verification failed"}
      subtitle={state === "done" ? "Thanks — your email address is confirmed." : error}
    >
      <ButtonLink to={user ? "/app" : "/login"} className="w-full">{user ? "Go to dashboard" : "Sign in"}</ButtonLink>
    </AuthLayout>
  );
}
