import { useEffect, useState } from "react";
import type { Category } from "../../lib/types";
import { errorMessage } from "../../lib/errors";
import { slugify } from "../../lib/format";
import { createCategory, updateCategory, descendantIds } from "../../services/categories";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { FormError } from "../auth/AuthLayout";

interface Props {
  open: boolean;
  onClose: () => void;
  all: Category[];
  category?: Category | null;
  defaultParent?: string;
  onSaved: () => void;
}

export function CategoryModal({ open, onClose, all, category, defaultParent = "", onSaved }: Props) {
  const [f, setF] = useState({ name: "", slug: "", description: "", parent: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(category ? { name: category.name, slug: category.slug, description: category.description, parent: category.parent } : { name: "", slug: "", description: "", parent: defaultParent });
  }, [open, category, defaultParent]);

  const blocked = category ? descendantIds(all, category.id) : [];
  const parents = all.filter((c) => !blocked.includes(c.id));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = slugify(f.slug || f.name);
    if (!f.name.trim() || !slug) return setError("Name is required.");
    setBusy(true);
    try {
      const payload = { name: f.name.trim(), slug, description: f.description.trim(), parent: f.parent };
      if (category) await updateCategory(category.id, payload);
      else await createCategory({ ...payload, sort_order: all.filter((c) => c.parent === f.parent).length });
      onSaved();
      onClose();
    } catch (err) {
      const msg = errorMessage(err);
      setError(/unique/i.test(msg) ? `The slug "${slug}" is already in use.` : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={category ? "Edit category" : "New category"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="cat-form" loading={busy}>{category ? "Save" : "Create"}</Button></>}>
      <form id="cat-form" onSubmit={submit} className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Name" required>{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: category ? f.slug : slugify(e.target.value) })} maxLength={120} />}</Field>
        <Field label="Slug">{(id) => <Input id={id} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} className="font-mono" />}</Field>
        <Field label="Parent category" hint="Leave empty for a top-level category.">
          {(id) => (
            <Select id={id} value={f.parent} onChange={(e) => setF({ ...f, parent: e.target.value })}>
              <option value="">None (top level)</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Description">{(id) => <Textarea id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} maxLength={1000} />}</Field>
      </form>
    </Modal>
  );
}
