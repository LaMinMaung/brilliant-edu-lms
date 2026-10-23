import { useEffect, useState } from "react";
import { Mail, Globe } from "lucide-react";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { getServerConfig, saveServerConfig, sendTestEmail } from "../../services/settings";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Field, Input } from "../ui/Field";
import { ErrorState, Loading } from "../ui/States";
import { FormError } from "../auth/AuthLayout";

/** Production domain + email sender. Stored in server settings; SMTP secrets are never sent to the browser. */
export function ServerConfigPanel() {
  const toast = useToast();
  const cfg = useLoader(getServerConfig, []);
  const [f, setF] = useState({ appURL: "", senderName: "", senderAddress: "" });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cfg.data) setF({ appURL: cfg.data.appURL, senderName: cfg.data.senderName, senderAddress: cfg.data.senderAddress });
  }, [cfg.data]);

  if (cfg.error) return <Panel title="Domain & email"><ErrorState message={cfg.error} onRetry={cfg.reload} /></Panel>;
  if (!cfg.data) return <Panel title="Domain & email"><Loading /></Panel>;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      cfg.setData(await saveServerConfig(f));
      toast("Domain & email settings saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await sendTestEmail();
      toast(`Test email sent to ${r.sentTo}`);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Panel title={<span className="flex items-center gap-2"><Globe className="size-4" aria-hidden /> Domain & email</span>}
      description="The application URL is used in password-reset and verification links. Set it to your production address, for example https://lms.ourwebsite.org.">
      <div className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Application URL" hint="No trailing slash. Must match the address learners use.">
          {(id) => <Input id={id} type="url" value={f.appURL} onChange={(e) => setF({ ...f, appURL: e.target.value })} className="font-mono" placeholder="https://lms.ourwebsite.org" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email sender name">{(id) => <Input id={id} value={f.senderName} onChange={(e) => setF({ ...f, senderName: e.target.value })} />}</Field>
          <Field label="Email sender address">{(id) => <Input id={id} type="email" value={f.senderAddress} onChange={(e) => setF({ ...f, senderAddress: e.target.value })} />}</Field>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-paper-2 px-3 py-2 text-sm">
          <span className="text-ink-2">Outgoing mail server:</span>
          <Badge tone={cfg.data.smtpEnabled ? "success" : "warning"}>{cfg.data.smtpEnabled ? "Configured" : "Not configured"}</Badge>
          {cfg.data.smtpHost && <span className="font-mono text-xs text-ink-3">{cfg.data.smtpHost}</span>}
          <span className="text-xs text-ink-3">Mail server credentials are managed in the server's secure settings and are never shown here.</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} loading={busy}>Save domain & email</Button>
          <Button variant="secondary" icon={<Mail className="size-4" />} onClick={test} loading={testing}>Send me a test email</Button>
        </div>
      </div>
    </Panel>
  );
}
