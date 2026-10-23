import pb from "../lib/pocketbase";
import type { Role } from "../lib/types";

const col = () => pb.collection("roles");

export const listRoles = () => col().getFullList<Role>({ sort: "created", requestKey: null });
export const createRole = (data: Partial<Role>) => col().create<Role>(data);
export const updateRole = (id: string, data: Partial<Role>) => col().update<Role>(id, data);
export const deleteRole = (id: string) => col().delete(id);

export function countUsersByRole(roleId: string) {
  return pb
    .collection("users")
    .getList(1, 1, { filter: pb.filter("role = {:r}", { r: roleId }), requestKey: null })
    .then((r) => r.totalItems);
}
