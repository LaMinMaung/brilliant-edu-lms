import { useLocation } from "react-router-dom";

/** Course management lives under /admin/courses or /teach/courses depending on the area. */
export function useManageBase() {
  const { pathname } = useLocation();
  return pathname.startsWith("/admin") ? "/admin/courses" : "/teach/courses";
}
