import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, UserCircle } from "lucide-react";
import { useCurrentUser } from "../../hooks/useAuth";
import { DASHBOARD_HOME, DASHBOARD_LABEL } from "../../lib/permissions";
import { cx, displayName } from "../../lib/format";
import { Avatar } from "../ui/Avatar";
import { Brand } from "./Brand";
import { NAV, isNavActive } from "./nav";
import { NotificationBell } from "../notifications/NotificationBell";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, role, logout } = useCurrentUser();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const kind = role?.dashboard || "student";
  const items = NAV[kind];

  const signOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-full flex-col bg-night text-paper">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-2">
          <Brand to={DASHBOARD_HOME[kind]} tone="light" />
          <span className="hidden lg:inline-flex"><NotificationBell onNavigate={onNavigate} /></span>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">{DASHBOARD_LABEL[kind]}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3" aria-label="Main">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = isNavActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors",
                    active ? "bg-night-2 text-paper" : "text-paper/70 hover:bg-night-2/60 hover:text-paper",
                  )}
                >
                  <Icon className={cx("size-[18px] shrink-0", active ? "text-marker" : "text-paper/50 group-hover:text-paper/80")} aria-hidden />
                  <span className="relative">
                    {item.label}
                    {active && <span className="animate-draw absolute -bottom-0.5 left-0 h-[3px] w-full origin-left rounded-full bg-marker/80" />}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-night-3 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar user={user} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName(user)}</p>
            <p className="truncate text-xs text-paper/50">{role?.name || "No role"}</p>
          </div>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <Link to="/profile" onClick={onNavigate} className="flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-paper/70 hover:bg-night-2 hover:text-paper">
            <UserCircle className="size-3.5" aria-hidden /> Profile
          </Link>
          <button onClick={signOut} className="flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-paper/70 hover:bg-night-2 hover:text-paper">
            <LogOut className="size-3.5" aria-hidden /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
