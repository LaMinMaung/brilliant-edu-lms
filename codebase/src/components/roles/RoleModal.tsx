import { useEffect, useState } from "react";
import type { DashboardKind, Permission, Role } from "../../lib/types";
import { errorMessage } from "../../lib/errors";
import { slugify } from "../../lib/format";
import { createRole } from "../../services/roles";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { FormError } from "../auth/AuthLayout";
import { PermissionChecklist } from "./PermissionChecklist";

export function RoleModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (r: Role) => void }) {
  const [f, setF] = useState({ name: "", slug: "", description: "", dashboard: "student" as DashboardKind });
  const [perms, setPerms] = useState<Permission[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setF({ name: "", slug: "", description: "", dashboard: "student" }); setPerms(["courses.enroll"]); setError(null); } }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = slugify(f.slug || f.name).replace(/-/g, "_");
    if (!f.name.trim() || !slug) return setError("Name is required.");
    setBusy(true);
    try {
      const r = await createRole({ ...f, name: f.name.trim(), slug, permissions: perms, is_system: false });
      onSaved(r);
      onClose();
    } catch (err) {
      const msg = errorMessage(err);
      setError(/unique/i.test(msg) ? "A role with that identifier already exists." : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Create role" description="Custom roles combine permissions and pick which dashboard their users land on."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="role-form" loading={busy}>Create role</Button></>}>
      <form id="role-form" onSubmit={submit} className="flex flex-col gap-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role name" required>{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: slugify(e.target.value).replace(/-/g, "_") })} maxLength={80} placeholder="e.g. Teaching assistant" />}</Field>
          <Field label="Identifier">{(id) => <Input id={id} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} className="font-mono" />}</Field>
        </div>
        <Field label="Dashboard" hint="Which area users with this role see after signing in.">
          {(id) => (
            <Select id={id} value={f.dashboard} onChange={(e) => setF({ ...f, dashboard: e.target.value as DashboardKind })}>
              <option value="student">Student dashboard</option>
              <option value="instructor">Instructor dashboard</option>
              <option value="admin">Admin dashboard</option>
            </Select>
          )}
        </Field>
        <Field label="Description">{(id) => <Textarea id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} maxLength={500} />}</Field>
        <PermissionChecklist value={perms} onChange={setPerms} />
      </form>
    </Modal>
  );
}
