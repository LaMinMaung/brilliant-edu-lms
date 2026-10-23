import pb from "../lib/pocketbase";
import type { Category } from "../lib/types";

const col = () => pb.collection("categories");

export const listCategories = () =>
  col().getFullList<Category>({ sort: "sort_order,name", requestKey: null });

export const createCategory = (data: Partial<Category>) => col().create<Category>(data);
export const updateCategory = (id: string, data: Partial<Category>) => col().update<Category>(id, data);
export const deleteCategory = (id: string) => col().delete(id);

export interface CategoryNode extends Category {
  children: CategoryNode[];
  depth: number;
}

/** Builds a sorted tree; flatten() returns it depth-first for selects and tables. */
export function buildTree(list: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  list.forEach((c) => map.set(c.id, { ...c, children: [], depth: 0 }));
  const roots: CategoryNode[] = [];
  map.forEach((node) => {
    const parent = node.parent ? map.get(node.parent) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const sort = (nodes: CategoryNode[], depth: number) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    nodes.forEach((n) => {
      n.depth = depth;
      sort(n.children, depth + 1);
    });
  };
  sort(roots, 0);
  return roots;
}

export function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

/** IDs of a category and all of its descendants (for catalog filtering). */
export function descendantIds(list: Category[], id: string): string[] {
  const out = [id];
  list.filter((c) => c.parent === id).forEach((c) => out.push(...descendantIds(list, c.id)));
  return out;
}
