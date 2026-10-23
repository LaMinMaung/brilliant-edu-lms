import { useState } from "react";
import { Check, Search } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { errorMessage } from "../../lib/errors";
import { cx, displayName } from "../../lib/format";
import { listUsers, lookupUserByEmail } from "../../services/users";
import { Button } from "../ui/Button";
import { Input } from "../ui/Field";

export interface PickedUser { id: string; name: string; email: string }

/** Admins search the directory; instructors look up a learner by exact email (server-checked). */
export function UserPicker({ value, onChange, excludeIds = [] }: { value: PickedUser | null; onChange: (u: PickedUser | null) => void; excludeIds?: string[] }) {
  const { can } = useAuth();
  return can("users.manage") ? <DirectoryPicker value={value} onChange={onChange} excludeIds={excludeIds} /> : <EmailLookup value={value} onChange={onChange} />;
}

function DirectoryPicker({ value, onChange, excludeIds }: { value: PickedUser | null; onChange: (u: PickedUser | null) => void; excludeIds: string[] }) {
  const [q, setQ] = useState("");
  const { data, loading } = useLoader(() => listUsers({ search: q, status: "active", perPage: 8 }), [q]);
  const items = (data?.items || []).filter((u) => !excludeIds.includes(u.id));
  return (
    <div className="rounded-md border border-rule-strong">
      <div className="relative border-b border-rule">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" aria-label="Search users" className="h-10 w-full bg-paper-2 pl-9 pr-3 text-sm focus:outline-none" />
      </div>
      <ul className="max-h-60 overflow-y-auto p-1">
        {loading && <li className="px-3 py-2 text-sm text-ink-3">Searching…</li>}
        {!loading && !items.length && <li className="px-3 py-2 text-sm text-ink-3">No matching active users not already enrolled.</li>}
        {items.map((u) => {
          const on = value?.id === u.id;
          return (
            <li key={u.id}>
              <button type="button" onClick={() => onChange(on ? null : { id: u.id, name: displayName(u), email: u.email })} aria-pressed={on}
                className={cx("flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm", on ? "bg-marker-soft" : "hover:bg-paper-2")}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{displayName(u)}</span>
                  <span className="block truncate text-xs text-ink-3">{u.email} · {u.expand?.role?.name}</span>
                </span>
                {on && <Check className="size-4" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmailLookup({ value, onChange }: { value: PickedUser | null; onChange: (u: PickedUser | null) => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const find = async () => {
    setBusy(true);
    setError(null);
    onChange(null);
    try {
      onChange(await lookupUserByEmail(email.trim()));
    } catch (err) {
      setError(errorMessage(err, "No active user with that email."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="learner@example.com" aria-label="Learner email"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); find(); } }} />
        <Button type="button" variant="secondary" onClick={find} loading={busy} disabled={!email}>Find</Button>
      </div>
      {error && <p className="text-xs text-brick" role="alert">{error}</p>}
      {value && (
        <div className="flex items-center gap-2 rounded-md border border-moss/25 bg-moss-soft px-3 py-2 text-sm">
          <Check className="size-4 text-moss" aria-hidden /> <strong>{value.name || value.email}</strong> <span className="text-ink-3">{value.email}</span>
        </div>
      )}
    </div>
  );
}
