import pb from "../lib/pocketbase";
import type { User } from "../lib/types";

const col = () => pb.collection("users");

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

export function listUsers({ search, role, status, page = 1, perPage = 20 }: UserFilters) {
  const parts: string[] = [];
  if (search) parts.push(pb.filter("(name ~ {:q} || email ~ {:q})", { q: search }));
  if (role) parts.push(pb.filter("role = {:role}", { role }));
  if (status) parts.push(pb.filter("status = {:status}", { status }));
  return col().getList<User>(page, perPage, {
    filter: parts.join(" && "),
    sort: "-created",
    expand: "role",
    requestKey: null,
  });
}

export const getUser = (id: string) => col().getOne<User>(id, { expand: "role", requestKey: null });

export interface UserInput {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  headline?: string;
  phone?: string;
  bio?: string;
  password?: string;
}

export function createUser(input: UserInput & { password: string; must_change_password?: boolean }) {
  return col().create<User>({
    ...input,
    email: input.email.trim().toLowerCase(),
    passwordConfirm: input.password,
    verified: true,
    emailVisibility: false,
  });
}

export function updateUser(id: string, data: Partial<UserInput> | FormData) {
  return col().update<User>(id, data, { expand: "role" });
}

export function setUserPassword(id: string, password: string) {
  return col().update<User>(id, { password, passwordConfirm: password });
}

export const deleteUser = (id: string) => col().delete(id);

export function recentUsers(limit = 6) {
  return col().getList<User>(1, limit, { sort: "-created", expand: "role", requestKey: null });
}

export function lookupUserByEmail(email: string) {
  return pb.send<{ id: string; name: string; email: string }>("/api/lms/users/lookup", {
    query: { email },
    requestKey: null,
  });
}
