import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { DASHBOARD_HOME } from "../../lib/permissions";
import type { Permission } from "../../lib/types";
import { Loading } from "../ui/States";
import Forbidden from "../../pages/Forbidden";
import ForcePasswordChange from "../../pages/ForcePasswordChange";

/**
 * Client-side guards improve UX only. Every read/write is independently
 * enforced by PocketBase collection rules on the server.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading label="Checking session" />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (user.must_change_password) return <ForcePasswordChange />;
  return <>{children}</>;
}

export function RequirePermission({ any, children }: { any: Permission[]; children: ReactNode }) {
  const { can } = useAuth();
  if (!any.some(can)) return <Forbidden />;
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, role, ready } = useAuth();
  if (!ready) return <Loading />;
  if (user) return <Navigate to={DASHBOARD_HOME[role?.dashboard || "student"]} replace />;
  return <>{children}</>;
}

export function HomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={DASHBOARD_HOME[role?.dashboard || "student"]} replace />;
}
