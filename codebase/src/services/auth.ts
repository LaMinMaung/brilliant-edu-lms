import pb from "../lib/pocketbase";
import { STUDENT_ROLE_ID } from "../lib/permissions";
import type { User } from "../lib/types";

const users = () => pb.collection("users");

export async function login(email: string, password: string) {
  const res = await users().authWithPassword<User>(email.trim().toLowerCase(), password, { expand: "role" });
  return res.record;
}

export async function refreshSession() {
  const res = await users().authRefresh<User>({ expand: "role", requestKey: null });
  return res.record;
}

export function logout() {
  pb.authStore.clear();
}

export interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export async function register(input: RegisterInput) {
  await users().create({
    ...input,
    email: input.email.trim().toLowerCase(),
    passwordConfirm: input.password,
    role: STUDENT_ROLE_ID,
    status: "active",
    emailVisibility: false,
  });
}

export const requestPasswordReset = (email: string) => users().requestPasswordReset(email.trim().toLowerCase());
export const confirmPasswordReset = (token: string, password: string) =>
  users().confirmPasswordReset(token, password, password);
export const requestVerification = (email: string) => users().requestVerification(email);
export const confirmVerification = (token: string) => users().confirmVerification(token);

export async function changeOwnPassword(id: string, oldPassword: string, password: string) {
  await users().update(id, { oldPassword, password, passwordConfirm: password });
}
