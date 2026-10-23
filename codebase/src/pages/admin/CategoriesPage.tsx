import { useState } from "react";
import { ArrowDown, ArrowUp, FolderPlus, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import type { Category } from "../../lib/types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { CategoryModal } from "../../components/categories/CategoryModal";
import { useLoader } from "../../hooks/useLoader";
import { useToast } from "../../hooks/useToast";
import { errorMessage } from "../../lib/errors";
import { cx } from "../../lib/format";
import { buildTree, deleteCategory, flatten, listCategories, updateCategory, type CategoryNode } from "../../services/categories";
import { count } from "../../services/stats";
import pb from "../../lib/pocketbase";

export default function CategoriesPage() {
  const toast = useToast();
  const data = useLoader(async () => {
    const cats = await listCategories();
    const counts = await Promise.all(cats.map((c) => count("courses", pb.filter("category = {:c}", { c: c.id }))));
    return { cats, counts: Object.fromEntries(cats.map((c, i) => [c.id, counts[i]])) as Record<string, number> };
  }, []);
  const [modal, setModal] = useState<{ category?: Category | null; parent?: string } | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading />;
  const { cats, counts } = data.data;
  const rows = flatten(buildTree(cats));

  const move = async (node: CategoryNode, dir: -1 | 1) => {
    const siblings = rows.filter((r) => r.parent === node.parent);
    const i = siblings.findIndex((s) => s.id === node.id);
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return;
    const ordered = [...siblings];
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    try {
      await Promise.all(ordered.map((s, idx) => updateCategory(s.id, { sort_order: idx })));
      data.reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Categories" description="Organise the catalog into top-level areas and sub-categories."
        actions={<Button icon={<FolderPlus className="size-4" />} onClick={() => setModal({})}>New category</Button>} />

      {!rows.length ? (
        <EmptyState icon={<FolderTree className="size-5" />} title="No categories" message="Create categories to organise courses." action={<Button size="sm" onClick={() => setModal({})}>New category</Button>} />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-rule bg-paper">
          {rows.map((n) => {
            const siblings = rows.filter((r) => r.parent === n.parent);
            const idx = siblings.findIndex((s) => s.id === n.id);
            return (
              <li key={n.id} className={cx("flex flex-wrap items-center gap-3 border-b border-rule py-3 pr-3 last:border-0 hover:bg-paper-2", n.depth === 0 && "bg-paper-2/60")}
                style={{ paddingLeft: 16 + n.depth * 28 }}>
                {n.depth > 0 && <span className="h-px w-3 bg-rule-strong" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <p className={cx("truncate", n.depth === 0 ? "font-display text-[1.05rem] font-semibold" : "text-sm font-medium")}>{n.name}</p>
                  <p className="truncate font-mono text-[11px] text-ink-3">/{n.slug}{n.description ? ` · ${n.description}` : ""}</p>
                </div>
                <span className="font-mono text-xs text-ink-3">{counts[n.id] || 0} course{counts[n.id] === 1 ? "" : "s"}</span>
                <div className="flex items-center">
                  <IconBtn label="Move up" onClick={() => move(n, -1)} disabled={idx === 0}><ArrowUp className="size-4" /></IconBtn>
                  <IconBtn label="Move down" onClick={() => move(n, 1)} disabled={idx === siblings.length - 1}><ArrowDown className="size-4" /></IconBtn>
                  <IconBtn label="Add sub-category" onClick={() => setModal({ parent: n.id })}><Plus className="size-4" /></IconBtn>
                  <IconBtn label="Edit" onClick={() => setModal({ category: n })}><Pencil className="size-4" /></IconBtn>
                  <IconBtn label="Delete" onClick={() => setRemoving(n)}><Trash2 className="size-4" /></IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CategoryModal open={!!modal} onClose={() => setModal(null)} all={cats} category={modal?.category} defaultParent={modal?.parent}
        onSaved={() => { toast("Category saved"); data.reload(); }} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title="Delete category?"
        message={`"${removing?.name}" will be deleted. Its courses become uncategorised and any sub-categories move to the top level.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!removing) return;
          try { await deleteCategory(removing.id); toast("Category deleted"); data.reload(); }
          catch (err) { toast(errorMessage(err), "error"); }
        }} />
    </>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className="rounded p-1.5 text-ink-3 hover:bg-paper-3 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}
