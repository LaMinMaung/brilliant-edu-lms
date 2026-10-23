import { useState, type FormEvent } from "react";
import { Camera, CheckCircle2, MailWarning } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Field, Input, Textarea } from "../components/ui/Field";
import { FormError } from "../components/auth/AuthLayout";
import { useCurrentUser } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { errorMessage } from "../lib/errors";
import { formatDate } from "../lib/format";
import { changeOwnPassword, login, requestVerification } from "../services/auth";
import { updateUser } from "../services/users";

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function ProfilePage() {
  const { user, role } = useCurrentUser();
  const toast = useToast();
  const [f, setF] = useState({ first_name: user.first_name, last_name: user.last_name, headline: user.headline, phone: user.phone, bio: user.bio });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pw, setPw] = useState({ old: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.first_name.trim() || !f.last_name.trim()) return setError("First and last name are required.");
    setBusy(true);
    setError(null);
    try {
      await updateUser(user.id, f);
      toast("Profile saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return toast("Use a JPG, PNG, WEBP or GIF image.", "error");
    if (file.size > 5 * 1024 * 1024) return toast("Profile photo must be 5 MB or smaller.", "error");
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      await updateUser(user.id, fd);
      toast("Profile photo updated");
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (pw.next.length < 8) return setPwError("New password must be at least 8 characters.");
    if (pw.next !== pw.confirm) return setPwError("New passwords do not match.");
    setPwBusy(true);
    try {
      await changeOwnPassword(user.id, pw.old, pw.next);
      await login(user.email, pw.next); // password change invalidates existing sessions
      setPw({ old: "", next: "", confirm: "" });
      toast("Password changed. Other sessions were signed out.");
    } catch (err) {
      setPwError(errorMessage(err));
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Account" title="Your profile" description="How you appear to instructors and classmates, and your sign-in settings." />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-6">
          <Panel>
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar user={user} size="lg" />
                <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full border border-rule bg-paper p-1.5 shadow-sm hover:bg-paper-2" title="Change photo">
                  <Camera className="size-4" aria-hidden />
                  <span className="sr-only">Change profile photo</span>
                  <input type="file" accept={AVATAR_TYPES.join(",")} className="sr-only" onChange={(e) => uploadAvatar(e.target.files?.[0])} />
                </label>
              </div>
              <p className="mt-4 font-display text-lg font-semibold">{user.name || user.email}</p>
              <p className="text-sm text-ink-3">{user.email}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Badge tone="info">{role?.name || "No role"}</Badge>
                {user.verified ? <Badge tone="success"><CheckCircle2 className="size-3" aria-hidden /> Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
              </div>
              <p className="mt-4 font-mono text-[11px] text-ink-3">Member since {formatDate(user.created)}</p>
              {!user.verified && (
                <Button variant="secondary" size="sm" className="mt-4" icon={<MailWarning className="size-4" />}
                  onClick={() => requestVerification(user.email).then(() => toast("Verification email sent")).catch((err) => toast(errorMessage(err), "error"))}>
                  Send verification email
                </Button>
              )}
            </div>
          </Panel>
        </div>
        <div className="flex flex-col gap-6">
          <Panel title="Profile details">
            <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><FormError message={error} /></div>
              <Field label="First name" required>{(id) => <Input id={id} value={f.first_name} onChange={set("first_name")} maxLength={80} />}</Field>
              <Field label="Last name" required>{(id) => <Input id={id} value={f.last_name} onChange={set("last_name")} maxLength={80} />}</Field>
              <Field label="Headline" hint="e.g. Year 10 student, Physics teacher">{(id) => <Input id={id} value={f.headline} onChange={set("headline")} maxLength={160} />}</Field>
              <Field label="Phone">{(id) => <Input id={id} value={f.phone} onChange={set("phone")} maxLength={40} />}</Field>
              <Field label="About you" className="sm:col-span-2">{(id) => <Textarea id={id} value={f.bio} onChange={set("bio")} rows={4} maxLength={2000} />}</Field>
              <div className="sm:col-span-2"><Button type="submit" loading={busy}>Save profile</Button></div>
            </form>
          </Panel>
          <Panel title="Change password" description="You'll stay signed in here; other devices will be signed out.">
            <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3"><FormError message={pwError} /></div>
              <Field label="Current password">{(id) => <Input id={id} type="password" autoComplete="current-password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} />}</Field>
              <Field label="New password">{(id) => <Input id={id} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />}</Field>
              <Field label="Confirm new">{(id) => <Input id={id} type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />}</Field>
              <div className="sm:col-span-3"><Button type="submit" variant="secondary" loading={pwBusy} disabled={!pw.old || !pw.next}>Update password</Button></div>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
