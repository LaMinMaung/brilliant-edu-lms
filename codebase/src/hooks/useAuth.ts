import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Use only on routes guarded by RequireAuth. */
export function useCurrentUser() {
  const ctx = useAuth();
  if (!ctx.user) throw new Error("No authenticated user");
  return { ...ctx, user: ctx.user };
}
