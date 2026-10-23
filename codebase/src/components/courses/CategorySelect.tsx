import type { SelectHTMLAttributes } from "react";
import { useLoader } from "../../hooks/useLoader";
import { buildTree, flatten, listCategories } from "../../services/categories";
import { Select } from "../ui/Field";

export function CategorySelect({ emptyLabel = "Uncategorised", ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { emptyLabel?: string }) {
  const { data } = useLoader(listCategories, []);
  const nodes = flatten(buildTree(data || []));
  return (
    <Select {...rest}>
      <option value="">{emptyLabel}</option>
      {nodes.map((n) => (
        <option key={n.id} value={n.id}>
          {"\u00A0\u00A0".repeat(n.depth * 2)}
          {n.depth > 0 ? "— " : ""}
          {n.name}
        </option>
      ))}
    </Select>
  );
}
