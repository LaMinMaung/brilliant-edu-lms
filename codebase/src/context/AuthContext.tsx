import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import pb from "../lib/pocketbase";
import type { Permission, Role, User } from "../lib/types";
import * as auth from "../services/auth";

interface AuthValue {
  user: User | null;
  role: Role | null;
  ready: boolean;
  can: (p: Permission) => boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  reload: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => (pb.authStore.isValid ? (pb.authStore.record as User) : null));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = pb.authStore.onChange((_token, record) => setUser(record ? (record as User) : null));
    (async () => {
      if (pb.authStore.isValid) {
        try {
          await auth.refreshSession();
        } catch {
          pb.authStore.clear();
        }
      }
      setReady(true);
    })();
    return unsub;
  }, []);

  const reload = useCallback(async () => {
    if (pb.authStore.isValid) await auth.refreshSession();
  }, []);

  const value = useMemo<AuthValue>(() => {
    const role = user?.expand?.role ?? null;
    return {
      user,
      role,
      ready,
      can: (p) => !!role?.permissions?.includes(p),
      login: auth.login,
      logout: auth.logout,
      reload,
    };
  }, [user, ready, reload]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
