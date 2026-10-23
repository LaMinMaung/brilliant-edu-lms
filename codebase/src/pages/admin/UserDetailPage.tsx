import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { KeyRound, Mail, Pencil, Power, Trash2, UserPlus } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Badge, CompletionBadge, UserStatusBadge } from "../../components/ui/Badge";
import { ProgressBar } from "../../components/ui/Progress";
import { ErrorState, Loading } from "../../components/ui/States";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ActivityFeed } from "../../components/dashboard/ActivityFeed";
import { UserFormModal } from "../../components/users/UserFormModal";
import { PasswordModal } from "../../components/users/PasswordModal";
import { EnrollModal } from "../../components/enrollments/EnrollModal";
import { useCurrentUser } from "../../hooks/useAuth";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { displayName, formatDate, formatDateTime } from "../../lib/format";
import { deleteUser, getUser, updateUser } from "../../services/users";
import { listRoles } from "../../services/roles";
import { listAllEnrollments } from "../../services/enrollments";
import { recentActivity } from "../../services/stats";
import { requestPasswordReset } from "../../services/auth";

export default function UserDetailPage() {
  const { id = "" } = useParams();
  const { user: me } = useCurrentUser();
  const toast = useToast();
  const navigate = useNavigate();
  const isSelf = me.id === id;
  const u = useLoader(() => getUser(id), [id]);
  const roles = useLoader(listRoles, []);
  const enrollments = useLoader(() => listAllEnrollments({ userId: id }), [id]);
  const activity = useLoader(() => recentActivity(12, id), [id]);
  const [modal, setModal] = useState<"edit" | "password" | "enroll" | "delete" | "status" | null>(null);

  if (u.error) return <ErrorState message={u.error} onRetry={u.reload} />;
  if (!u.data) return <Loading />;
  const user = u.data;

  const toggleStatus = async () => {
    const next = user.status === "active" ? "inactive" : "active";
    try {
      u.setData(await updateUser(user.id, { status: next }));
      toast(next === "active" ? "Account activated" : "Account deactivated; active sessions were signed out");
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  const sendReset = async () => {
    try {
      await requestPasswordReset(user.email);
      toast(`Password reset email sent to ${user.email}`);
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  const info: [string, string][] = [
    ["Email", user.email],
    ["Registered", formatDateTime(user.created)],
    ["Last login", user.last_login ? formatDateTime(user.last_login) : "Never"],
    ["Email verified", user.verified ? "Yes" : "No"],
    ["Phone", user.phone || "—"],
    ["Headline", user.headline || "—"],
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Users", to: "/admin/users" }, { label: displayName(user) }]}
        title={
          <span className="flex items-center gap-4">
            <Avatar user={user} size="lg" className="hidden sm:inline-flex" />
            <span>{displayName(user)}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{user.expand?.role?.name || "No role"}</Badge>
            <UserStatusBadge status={user.status} />
            {isSelf && <Badge tone="marker">You</Badge>}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Pencil className="size-4" />} onClick={() => setModal("edit")}>Edit</Button>
            {!isSelf && (
              <Button variant="secondary" size="sm" icon={<Power className="size-4" />} onClick={() => setModal("status")}>
                {user.status === "active" ? "Deactivate" : "Activate"}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Profile">
            <dl className="flex flex-col gap-3 text-sm">
              {info.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-rule pb-2 last:border-0">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="truncate text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {user.bio && <p className="mt-4 whitespace-pre-line text-sm text-ink-2">{user.bio}</p>}
          </Panel>
          <Panel title="Password">
            <div className="flex flex-col gap-2">
              <Button variant="secondary" size="sm" icon={<Mail className="size-4" />} onClick={sendReset}>Send reset email</Button>
              <Button variant="secondary" size="sm" icon={<KeyRound className="size-4" />} onClick={() => setModal("password")}>Set password manually</Button>
            </div>
          </Panel>
          {!isSelf && (
            <Button variant="ghost" size="sm" className="text-brick" icon={<Trash2 className="size-4" />} onClick={() => setModal("delete")}>Delete user permanently</Button>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Panel
            title="Enrollments"
            description="Courses this user is enrolled in."
            actions={<Button size="sm" variant="secondary" icon={<UserPlus className="size-4" />} onClick={() => setModal("enroll")}>Enroll in course</Button>}
            bodyClassName="p-0"
          >
            {enrollments.loading ? <Loading /> : enrollments.data?.length ? (
              <ul>
                {enrollments.data.map((e) => (
                  <li key={e.id} className="grid gap-2 border-b border-rule px-5 py-3 last:border-0 sm:grid-cols-[1fr_180px_auto] sm:items-center">
                    <div className="min-w-0">
                      <Link to={`/admin/courses/${e.course}`} className="block truncate text-sm font-medium hover:underline">{e.expand?.course?.title}</Link>
                      <p className="text-xs text-ink-3">Enrolled {formatDate(e.created)} · {e.method === "self" ? "self" : "manual"}{e.status === "suspended" ? " · suspended" : ""}</p>
                    </div>
                    <ProgressBar value={e.progress} showLabel size="sm" />
                    <CompletionBadge status={e.completion_status} />
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 py-8 text-center text-sm text-ink-3">Not enrolled in any course.</p>}
          </Panel>
          <Panel title="Recent activity">
            {activity.loading ? <Loading /> : <ActivityFeed items={activity.data?.items || []} showActor={false} />}
          </Panel>
        </div>
      </div>

      <UserFormModal open={modal === "edit"} onClose={() => setModal(null)} roles={roles.data || []} user={user} isSelf={isSelf}
        onSaved={(saved) => { u.setData(saved); toast("User updated"); }} />
      <PasswordModal open={modal === "password"} onClose={() => setModal(null)} userId={user.id} onDone={() => toast("Password updated")} />
      <EnrollModal open={modal === "enroll"} onClose={() => setModal(null)} userId={user.id} excludeCourseIds={(enrollments.data || []).map((e) => e.course)}
        onDone={() => { toast("Enrolled"); enrollments.reload(); }} />
      <ConfirmDialog open={modal === "status"} onClose={() => setModal(null)} danger={user.status === "active"}
        title={user.status === "active" ? "Deactivate this account?" : "Activate this account?"}
        message={user.status === "active" ? "The user will be signed out everywhere and won't be able to sign in until reactivated. Their data is kept." : "The user will be able to sign in again."}
        confirmLabel={user.status === "active" ? "Deactivate" : "Activate"} onConfirm={toggleStatus} />
      <ConfirmDialog open={modal === "delete"} onClose={() => setModal(null)} title="Delete this user?"
        message="This permanently deletes the account along with its enrollments and progress. Consider deactivating instead. This cannot be undone."
        confirmLabel="Delete user"
        onConfirm={async () => {
          try { await deleteUser(user.id); toast("User deleted"); navigate("/admin/users"); }
          catch (err) { toast(errorMessage(err), "error"); }
        }} />
    </>
  );
}
