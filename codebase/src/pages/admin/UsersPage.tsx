import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Users } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { SearchInput } from "../../components/ui/SearchInput";
import { Pagination, Table, Td, Th } from "../../components/ui/Table";
import { Avatar } from "../../components/ui/Avatar";
import { Badge, UserStatusBadge } from "../../components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { UserFormModal } from "../../components/users/UserFormModal";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { displayName, formatDate, timeAgo } from "../../lib/format";
import { listUsers } from "../../services/users";
import { listRoles } from "../../services/roles";

export default function UsersPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const roles = useLoader(listRoles, []);
  const users = useLoader(() => listUsers({ search, role, status, page }), [search, role, status, page]);
  const onSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Everyone with an account. Search, filter, create and manage access."
        actions={<Button icon={<UserPlus className="size-4" />} onClick={() => setCreating(true)} disabled={!roles.data}>Create user</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={search} onChange={onSearch} placeholder="Search name or email" />
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="w-auto min-w-40" aria-label="Filter by role">
          <option value="">All roles</option>
          {(roles.data || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-auto min-w-36" aria-label="Filter by status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {users.error ? <ErrorState message={users.error} onRetry={users.reload} /> : users.loading && !users.data ? <Loading /> : users.data?.items.length ? (
        <>
          <Table>
            <thead>
              <tr><Th>User</Th><Th>Role</Th><Th>Status</Th><Th>Last login</Th><Th>Registered</Th></tr>
            </thead>
            <tbody>
              {users.data.items.map((u) => (
                <tr key={u.id} className="hover:bg-paper-2">
                  <Td>
                    <Link to={`/admin/users/${u.id}`} className="flex items-center gap-3">
                      <Avatar user={u} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium hover:underline">{displayName(u)}</span>
                        <span className="block truncate text-xs text-ink-3">{u.email}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td><Badge tone={u.expand?.role?.dashboard === "admin" ? "marker" : "info"}>{u.expand?.role?.name || "—"}</Badge></Td>
                  <Td><UserStatusBadge status={u.status} /></Td>
                  <Td className="font-mono text-xs text-ink-2">{u.last_login ? timeAgo(u.last_login) : "never"}</Td>
                  <Td className="font-mono text-xs text-ink-2">{formatDate(u.created)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={users.data.page} totalPages={users.data.totalPages} total={users.data.totalItems} onPage={setPage} />
        </>
      ) : (
        <EmptyState icon={<Users className="size-5" />} title="No users match" message="Try a different search or clear the filters." />
      )}

      <UserFormModal
        open={creating}
        onClose={() => setCreating(false)}
        roles={roles.data || []}
        onSaved={(u) => { toast(`Created ${displayName(u)}`); users.reload(); }}
      />
    </>
  );
}
