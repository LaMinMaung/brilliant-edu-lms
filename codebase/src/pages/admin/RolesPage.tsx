import { useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import type { Permission, Role } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ErrorState, Loading } from "../../components/ui/States";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PermissionChecklist } from "../../components/roles/PermissionChecklist";
import { RoleModal } from "../../components/roles/RoleModal";
import { useAuth } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { DASHBOARD_LABEL } from "../../lib/permissions";
import { countUsersByRole, deleteRole, listRoles, updateRole } from "../../services/roles";

export default function RolesPage() {
  const toast = useToast();
  const { reload: reloadAuth, role: myRole } = useAuth();
  const data = useLoader(async () => {
    const roles = await listRoles();
    const counts = await Promise.all(roles.map((r) => countUsersByRole(r.id)));
    return roles.map((r, i) => ({ ...r, users: counts[i] }));
  }, []);
  const [drafts, setDrafts] = useState<Record<string, Permission[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Role | null>(null);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading />;

  const save = async (r: Role) => {
    setSaving(r.id);
    try {
      await updateRole(r.id, { permissions: drafts[r.id] });
      toast(`Permissions for ${r.name} updated`);
      setDrafts(({ [r.id]: _omit, ...rest }) => { void _omit; return rest; });
      await data.reload();
      if (myRole?.id === r.id) await reloadAuth();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Roles & permissions"
        description="Permissions are enforced by the server on every request. Changes apply to all users with the role."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Create role</Button>} />
      <div className="flex flex-col gap-6">
        {data.data.map((r) => {
          const locked = r.slug === "admin";
          const current = drafts[r.id] || r.permissions || [];
          const dirty = !!drafts[r.id];
          return (
            <Panel key={r.id}
              title={<span className="flex flex-wrap items-center gap-2">{r.name} {r.is_system && <Badge>System</Badge>} <Badge tone="info">{DASHBOARD_LABEL[r.dashboard]}</Badge></span>}
              description={<>{r.description || "No description"} · <span className="font-mono text-xs">{r.users} user{r.users === 1 ? "" : "s"}</span></>}
              actions={
                <>
                  {dirty && <Button size="sm" variant="ghost" onClick={() => setDrafts(({ [r.id]: _o, ...rest }) => { void _o; return rest; })}>Discard</Button>}
                  {dirty && <Button size="sm" onClick={() => save(r)} loading={saving === r.id}>Save permissions</Button>}
                  {!r.is_system && <Button size="sm" variant="ghost" aria-label={`Delete ${r.name}`} icon={<Trash2 className="size-4" />} onClick={() => setRemoving(r)} />}
                </>
              }>
              {locked && (
                <p className="mb-4 flex items-center gap-2 rounded-md bg-paper-2 px-3 py-2 text-xs text-ink-2">
                  <Lock className="size-3.5" aria-hidden /> The Super Administrator role always has every permission, so the platform can't be locked out.
                </p>
              )}
              <PermissionChecklist value={current} disabled={locked} onChange={(v) => setDrafts((d) => ({ ...d, [r.id]: v }))} />
            </Panel>
          );
        })}
      </div>

      <RoleModal open={creating} onClose={() => setCreating(false)} onSaved={(r) => { toast(`Role "${r.name}" created`); data.reload(); }} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title="Delete role?"
        message={`"${removing?.name}" will be deleted. Roles that are still assigned to users can't be deleted; reassign those users first.`}
        confirmLabel="Delete role"
        onConfirm={async () => {
          if (!removing) return;
          try { await deleteRole(removing.id); toast("Role deleted"); data.reload(); }
          catch (err) { toast(errorMessage(err, "This role is still assigned to users."), "error"); }
        }} />
    </>
  );
}
