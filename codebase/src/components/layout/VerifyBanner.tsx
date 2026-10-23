import { useState } from "react";
import { MailWarning } from "lucide-react";
import { useCurrentUser } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { requestVerification } from "../../services/auth";

export function VerifyBanner() {
  const { user } = useCurrentUser();
  const toast = useToast();
  const [sent, setSent] = useState(false);
  if (user.verified) return null;

  const send = async () => {
    try {
      await requestVerification(user.email);
      setSent(true);
      toast("Verification email sent. Check your inbox.");
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-marker-deep/20 bg-marker-soft px-4 py-2 text-sm text-ink sm:px-8">
      <MailWarning className="size-4 text-marker-deep" aria-hidden />
      <span>Your email address isn't verified yet.</span>
      <button onClick={send} disabled={sent} className="font-medium underline underline-offset-2 disabled:no-underline disabled:opacity-60">
        {sent ? "Email sent" : "Send verification email"}
      </button>
    </div>
  );
}
