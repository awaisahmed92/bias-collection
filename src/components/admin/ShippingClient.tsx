"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/primitives";
import { cn, formatMoney } from "@/lib/utils";

export default function ShippingClient({ methods }: { methods: any[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<any | null>(null);
  const [state, setState] = useState<{ saving: boolean; error?: string }>({ saving: false });

  const openNew = () => setEditing({ name: "", description: "", zone: "", price: 0, freeAbove: "", minDays: 2, maxDays: 5, isActive: true, sortOrder: 0 });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ saving: true });
    const res = await fetch("/api/admin/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, freeAbove: editing.freeAbove === "" ? null : Number(editing.freeAbove), zone: editing.zone || null }),
    });
    const json = await res.json();
    if (!json.ok) return setState({ saving: false, error: json.error });
    setEditing(null);
    setState({ saving: false });
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this shipping method?")) return;
    await fetch(`/api/admin/shipping?id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Shipping</h1>
          <p className="text-sm text-ink/50">Zone-matched methods (e.g. zone "Karachi") override generic ones at checkout.</p>
        </div>
        <button className="admin-btn" onClick={openNew}>+ New Method</button>
      </div>

      {state.error && <p className="mb-4 border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{state.error}</p>}

      {editing && (
        <form onSubmit={save} className="admin-card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="admin-label">Name *</label><input required className="admin-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
          <div><label className="admin-label">Zone (city, optional)</label><input className="admin-input" placeholder="Karachi" value={editing.zone} onChange={(e) => setEditing({ ...editing, zone: e.target.value })} /></div>
          <div><label className="admin-label">Price (Rs.)</label><input type="number" min="0" className="admin-input" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
          <div><label className="admin-label">Free Above (Rs.)</label><input type="number" min="0" placeholder="Optional" className="admin-input" value={editing.freeAbove} onChange={(e) => setEditing({ ...editing, freeAbove: e.target.value })} /></div>
          <div><label className="admin-label">Min Days</label><input type="number" min="0" className="admin-input" value={editing.minDays} onChange={(e) => setEditing({ ...editing, minDays: Number(e.target.value) })} /></div>
          <div><label className="admin-label">Max Days</label><input type="number" min="0" className="admin-input" value={editing.maxDays} onChange={(e) => setEditing({ ...editing, maxDays: Number(e.target.value) })} /></div>
          <div><label className="admin-label">Sort Order</label><input type="number" className="admin-input" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} /></div>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Active</label>
          <div className="sm:col-span-2 lg:col-span-4"><label className="admin-label">Description</label><input className="admin-input" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
          <div className="flex gap-3 sm:col-span-2 lg:col-span-4">
            <button disabled={state.saving} className="admin-btn">{state.saving ? <Spinner /> : editing.id ? "Save Changes" : "Create Method"}</button>
            <button type="button" className="admin-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admin-card overflow-x-auto p-0">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-line bg-off">
              <th className="admin-th">Method</th><th className="admin-th">Zone</th><th className="admin-th">Price</th>
              <th className="admin-th">Free Above</th><th className="admin-th">ETA</th><th className="admin-th">Status</th><th className="admin-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {methods.map((m) => (
              <tr key={m.id} className="hover:bg-off/50">
                <td className="admin-td"><p className="font-semibold">{m.name}</p><p className="text-xs text-ink/40">{m.description}</p></td>
                <td className="admin-td">{m.zone ?? <span className="text-ink/40">All zones</span>}</td>
                <td className="admin-td font-semibold">{formatMoney(m.price)}</td>
                <td className="admin-td">{m.freeAbove ? formatMoney(m.freeAbove) : "—"}</td>
                <td className="admin-td text-ink/60">{m.minDays}–{m.maxDays} days</td>
                <td className="admin-td"><span className={cn("badge", m.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500")}>{m.isActive ? "Active" : "Disabled"}</span></td>
                <td className="admin-td text-right">
                  <div className="flex justify-end gap-3">
                    <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline" onClick={() => setEditing({ ...m, freeAbove: m.freeAbove ?? "", zone: m.zone ?? "" })}>Edit</button>
                    <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700 hover:underline" onClick={() => remove(m.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
