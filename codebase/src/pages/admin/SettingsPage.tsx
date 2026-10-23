import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { SiteSettings } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea, Toggle } from "../../components/ui/Field";
import { Loading } from "../../components/ui/States";
import { FormError } from "../../components/auth/AuthLayout";
import { AssetInput } from "../../components/settings/AssetInput";
import { ServerConfigPanel } from "../../components/settings/ServerConfigPanel";
import { SystemInfoPanel } from "../../components/settings/SystemInfoPanel";
import { SelfTestPanel } from "../../components/settings/SelfTestPanel";
import { useAuth } from "../../hooks/useAuth";
import { useSettings } from "../../hooks/useSettings";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { fileUrl } from "../../services/files";
import { updateSettings } from "../../services/settings";

type Form = Pick<SiteSettings, "site_name" | "tagline" | "description" | "support_email" | "default_language" | "timezone" | "allow_registration" | "require_email_verification" | "allow_self_enrollment" | "default_self_enrollment" | "max_upload_mb" | "footer_text" | "email_notifications">;

const LANGUAGES: [string, string][] = [
  ["en", "English"], ["es", "Español"], ["fr", "Français"], ["de", "Deutsch"], ["it", "Italiano"], ["pt", "Português"], ["nl", "Nederlands"],
  ["pl", "Polski"], ["ro", "Română"], ["bg", "Български"], ["el", "Ελληνικά"], ["tr", "Türkçe"], ["ar", "العربية"],
];
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const ICON_TYPES = ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"];

export default function SettingsPage() {
  const { settings, refresh } = useSettings();
  const { can } = useAuth();
  const toast = useToast();
  const [f, setF] = useState<Form | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [icon, setIcon] = useState<File | null>(null);
  const [iconRemoved, setIconRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timezones = useMemo(() => {
    const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    return sv ? sv("timeZone") : ["UTC"];
  }, []);

  useEffect(() => {
    if (!settings) return;
    setF({
      site_name: settings.site_name, tagline: settings.tagline, description: settings.description, support_email: settings.support_email,
      default_language: settings.default_language || "en", timezone: settings.timezone || "UTC",
      allow_registration: settings.allow_registration, require_email_verification: settings.require_email_verification,
      allow_self_enrollment: settings.allow_self_enrollment, default_self_enrollment: settings.default_self_enrollment,
      max_upload_mb: settings.max_upload_mb, footer_text: settings.footer_text, email_notifications: settings.email_notifications,
    });
  }, [settings]);

  if (!f || !settings) return <Loading />;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.site_name.trim()) return setError("LMS name is required.");
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      Object.entries({ ...f, max_upload_mb: Math.min(50, Math.max(1, Number(f.max_upload_mb) || 50)) }).forEach(([k, v]) => fd.append(k, String(v ?? "")));
      if (logo) fd.append("logo", logo); else if (logoRemoved) fd.append("logo", "");
      if (icon) fd.append("favicon", icon); else if (iconRemoved) fd.append("favicon", "");
      await updateSettings(fd);
      await refresh();
      setLogo(null); setIcon(null); setLogoRemoved(false); setIconRemoved(false);
      toast("Settings saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Settings" description="Identity, locale, registration, enrollment and server configuration." />
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <form onSubmit={submit} className="flex flex-col gap-6">
          <FormError message={error} />
          <Panel title="Identity">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="LMS name" required>{(id) => <Input id={id} value={f.site_name} onChange={(e) => set("site_name", e.target.value)} maxLength={120} />}</Field>
              <Field label="Support email">{(id) => <Input id={id} type="email" value={f.support_email} onChange={(e) => set("support_email", e.target.value)} />}</Field>
              <Field label="LMS description" className="sm:col-span-2" hint="Shown on the home page and in search results.">{(id) => <Textarea id={id} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} rows={2} />}</Field>
              <Field label="Tagline" className="sm:col-span-2" hint="The home-page headline. Its last word gets the highlighter.">{(id) => <Input id={id} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={240} />}</Field>
              <Field label="Footer text" className="sm:col-span-2">{(id) => <Input id={id} value={f.footer_text} onChange={(e) => set("footer_text", e.target.value)} maxLength={300} />}</Field>
              <AssetInput label="Logo" hint="PNG, JPG, WEBP or SVG · max 2 MB" accept={LOGO_TYPES} maxBytes={2 * 1024 * 1024}
                currentUrl={settings.logo ? fileUrl(settings, settings.logo) : undefined} file={logo} removed={logoRemoved}
                onFile={(x) => { setLogo(x); if (x) setLogoRemoved(false); }} onRemove={() => setLogoRemoved(true)} onError={setError} />
              <AssetInput label="Favicon" hint="PNG, ICO or SVG · max 512 KB" accept={ICON_TYPES} maxBytes={512 * 1024} square
                currentUrl={settings.favicon ? fileUrl(settings, settings.favicon) : undefined} file={icon} removed={iconRemoved}
                onFile={(x) => { setIcon(x); if (x) setIconRemoved(false); }} onRemove={() => setIconRemoved(true)} onError={setError} />
            </div>
          </Panel>
          <Panel title="Locale" description="Used for date and time formatting across the platform.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default language">
                {(id) => <Select id={id} value={f.default_language} onChange={(e) => set("default_language", e.target.value)}>{LANGUAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}
              </Field>
              <Field label="Timezone">
                {(id) => <Select id={id} value={f.timezone} onChange={(e) => set("timezone", e.target.value)}>{timezones.map((t) => <option key={t} value={t}>{t}</option>)}</Select>}
              </Field>
            </div>
          </Panel>
          <Panel title="Accounts">
            <div className="flex flex-col gap-5">
              <Toggle checked={f.allow_registration} onChange={(v) => set("allow_registration", v)} label="Registration enabled" description="When off, only administrators can create accounts (enforced by the server)." />
              <Toggle checked={f.require_email_verification} onChange={(v) => set("require_email_verification", v)} label="Require email verification to sign in" description="Unverified users are blocked at sign-in. Admin-created users are pre-verified." />
            </div>
          </Panel>
          <Panel title="Enrollment & files">
            <div className="flex flex-col gap-5">
              <Toggle checked={f.allow_self_enrollment} onChange={(v) => set("allow_self_enrollment", v)} label="Self-enrollment enabled" description="Master switch. When off, students can't enroll themselves in any course (enforced by the server)." />
              <Toggle checked={f.default_self_enrollment} onChange={(v) => set("default_self_enrollment", v)} label="New courses allow self-enrollment by default" description="Pre-selected when creating a course; can be changed per course." />
              <Field label="Max upload size (MB)" hint="Per file. The server enforces a hard limit of 50 MB.">
                {(id) => <Input id={id} type="number" min={1} max={50} value={f.max_upload_mb} onChange={(e) => set("max_upload_mb", Number(e.target.value))} className="w-32" />}
              </Field>
            </div>
          </Panel>
          <Panel title="Notifications" description="In-app notifications (announcements, grades, quiz results, deadlines, replies) are always on.">
            <Toggle checked={f.email_notifications} onChange={(v) => set("email_notifications", v)} label="Also send notifications by email"
              description="Preference only for now: email delivery of notifications is planned for a later release. Account emails (verification, password reset) are unaffected." />
          </Panel>
          <div><Button type="submit" loading={busy}>Save settings</Button></div>
        </form>

        <div className="flex flex-col gap-6">
          <ServerConfigPanel />
          {can("system.view") && <SystemInfoPanel />}
          {can("system.view") && <SelfTestPanel />}
        </div>
      </div>
    </>
  );
}
