"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ImagePicker from "./ImagePicker";
import { Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Cat = {
  id: string; name: string; slug: string; description: string | null; image: string | null;
  parentId: string | null; displayOrder: number; isActive: boolean;
  parent: { name: string } | null; _count: { products: number };
};

export default function CategoriesClient({ initial }: { initial: Cat[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);
  const [state, setState] = useState<{ saving: boolean; error?: string }>({ saving: false });

  const refresh = () => router.refresh();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name) return;
    setState({ saving: true });
    const res = await fetch("/api/admin/categories", {
      method: editing.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editing.name,
        slug: editing.slug || null,
        description: editing.description || null,
        image: editing.image || null,
        parentId: editing.parentId || null,
        displayOrder: editing.displayOrder ?? 0,
        isActive: editing.isActive ?? true,
      }),
    });
    const json = await res.json();
    if (!json.ok) return setState({ saving: false, error: json.error });
    setEditing(null);
    setState({ saving: false });
    refresh();
  };

  const remove = async (cat: Cat) => {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    const res = await fetch(`/api/admin/categories/${cat.id}` + "", { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) alert(json.error);
    refresh();
  };

  const top = initial.filter((c) => !c.parentId);
  const childrenOf = (id: string) => initial.filter((c) => c.parentId === id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl">Categories</h1>
        <button className="admin-btn" onClick={() => setEditing({ displayOrder: 0, isActive: true })}>+ New Category</button>
      </div>

      {state.error && <p className="mb-4 border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{state.error}</p>}

      {editing && (
        <form onSubmit={save} className="admin-card mb-6 grid gap-4 sm:grid-cols-2">
          <div><label className="admin-label">Name *</label><input required className="admin-input" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
          <div><label className="admin-label">Slug</label><input className="admin-input" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto" /></div>
          <div>
            <label className="admin-label">Parent Category</label>
            <select className="admin-input" value={editing.parentId ?? ""} onChange={(e) => setEditing({ ...editing, parentId: e.target.value || null })}>
              <option value="">— None (top level) —</option>
              {top.filter((c) => c.id !== editing.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="admin-label">Display Order</label><input type="number" className="admin-input" value={editing.displayOrder ?? 0} onChange={(e) => setEditing({ ...editing, displayOrder: Number(e.target.value) })} /></div>
          <div className="sm:col-span-2"><label className="admin-label">Description</label><textarea className="admin-input" rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <ImagePicker label="Image" value={editing.image ?? ""} onChange={(url) => setEditing({ ...editing, image: url })} folder="categories" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={editing.isActive ?? true} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Active (visible on storefront)</label>
          <div className="flex gap-3 sm:col-span-2">
            <button disabled={state.saving} className="admin-btn">{state.saving ? <Spinner /> : editing.id ? "Save Changes" : "Create Category"}</button>
            <button type="button" className="admin-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admin-card overflow-x-auto p-0">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-line bg-off">
              <th className="admin-th">Category</th><th className="admin-th">Slug</th><th className="admin-th">Products</th>
              <th className="admin-th">Order</th><th className="admin-th">Status</th><th className="admin-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {top.map((c) => (
              <CategoryRow key={c.id} cat={c} depth={0} onEdit={setEditing} onDelete={remove} />
            ))}
            {top.map((c) => childrenOf(c.id).map((ch) => <CategoryRow key={ch.id} cat={ch} depth={1} onEdit={setEditing} onDelete={remove} />))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryRow({ cat, depth, onEdit, onDelete }: { cat: Cat; depth: number; onEdit: (c: Cat) => void; onDelete: (c: Cat) => void }) {
  return (
    <tr className="hover:bg-off/50">
      <td className="admin-td">
        <div className="flex items-center gap-3" style={{ paddingLeft: depth * 24 }}>
          <div className="h-10 w-8 shrink-0 overflow-hidden bg-sand">{cat.image && <img src={cat.image} alt="" className="h-full w-full object-cover" />}</div>
          <div>
            <p className="font-semibold">{depth > 0 && "└ "}{cat.parent ? `${cat.parent.name} → ` : ""}{cat.name}</p>
            {cat.description && <p className="max-w-md truncate text-xs text-ink/40">{cat.description}</p>}
          </div>
        </div>
      </td>
      <td className="admin-td text-ink/50">{cat.slug}</td>
      <td className="admin-td">{cat._count.products}</td>
      <td className="admin-td">{cat.displayOrder}</td>
      <td className="admin-td"><span className={cn("badge", cat.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500")}>{cat.isActive ? "Active" : "Hidden"}</span></td>
      <td className="admin-td text-right">
        <div className="flex justify-end gap-3">
          <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline" onClick={() => onEdit(cat)}>Edit</button>
          <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700 hover:underline" onClick={() => onDelete(cat)}>Delete</button>
        </div>
      </td>
    </tr>
  );
}
