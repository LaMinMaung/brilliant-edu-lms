import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import pb from "../../lib/pocketbase";
import type { User } from "../../lib/types";
import { useLoader } from "../../hooks/useLoader";
import { cx, displayName } from "../../lib/format";
import { Avatar } from "../ui/Avatar";

/** Admin-only: choose instructors among users whose role can teach. */
export function InstructorPicker({ value, onChange, ownerId }: { value: string[]; onChange: (ids: string[]) => void; ownerId?: string }) {
  const [q, setQ] = useState("");
  const { data, loading } = useLoader(
    () =>
      pb.collection("users").getFullList<User>({
        filter: `role.permissions ~ '"courses.teach"' && status = "active"`,
        sort: "name",
        requestKey: null,
      }),
    [],
  );
  const list = useMemo(
    () => (data || []).filter((u) => !q || displayName(u).toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="rounded-md border border-rule-strong">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter instructors…"
        aria-label="Filter instructors"
        className="h-9 w-full border-b border-rule bg-paper-2 px-3 text-sm focus:outline-none"
      />
      <ul className="max-h-52 overflow-y-auto p-1">
        {loading && <li className="px-3 py-2 text-sm text-ink-3">Loading…</li>}
        {!loading && list.length === 0 && <li className="px-3 py-2 text-sm text-ink-3">No teaching-capable users found.</li>}
        {list.map((u) => {
          const on = value.includes(u.id);
          return (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => toggle(u.id)}
                aria-pressed={on}
                className={cx("flex w-full items-center gap-3 rounded px-2 py-1.5 text-left text-sm", on ? "bg-marker-soft" : "hover:bg-paper-2")}
              >
                <Avatar user={u} size="xs" />
                <span className="flex-1 truncate">
                  {displayName(u)} {u.id === ownerId && <span className="font-mono text-[10px] uppercase text-ink-3">owner</span>}
                </span>
                {on && <Check className="size-4 text-ink" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
