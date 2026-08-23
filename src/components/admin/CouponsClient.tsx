"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/primitives";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export default function CouponsClient({
  coupons,
  products,
  categories,
}: {
  coupons: any[];
  products: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<any | null>(null);
  const [state, setState] = useState<{ saving: boolean; error?: string }>({ saving: false });

  const toDate = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

  const openNew = () =>
    setEditing({
      code: "", description: "", type: "PERCENTAGE", amount: 10, minOrderAmount: "", maxDiscount: "",
      startDate: "", endDate: "", usageLimit: "", usagePerCustomer: "", appliesTo: "ALL",
      productIds: [] as string[], categoryIds: [] as string[], isActive: true,
    });

  const openEdit = (c: any) =>
    setEditing({
      id: c.id, code: c.code, description: c.description ?? "", type: c.type, amount: c.amount,
      minOrderAmount: c.minOrderAmount ?? "", maxDiscount: c.maxDiscount ?? "",
      startDate: toDate(c.startDate), endDate: toDate(c.endDate),
      usageLimit: c.usageLimit ?? "", usagePerCustomer: c.usagePerCustomer ?? "",
      appliesTo: c.appliesTo, productIds: (c.productIds || "").split(",").filter(Boolean),
      categoryIds: (c.categoryIds || "").split(",").filter(Boolean), isActive: c.isActive,
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ saving: true });
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editing,
        minOrderAmount: editing.minOrderAmount === "" ? null : Number(editing.minOrderAmount),
        maxDiscount: editing.maxDiscount === "" ? null : Number(editing.maxDiscount),
        usageLimit: editing.usageLimit === "" ? null : Number(editing.usageLimit),
        usagePerCustomer: editing.usagePerCustomer === "" ? null : Number(editing.usagePerCustomer),
        startDate: editing.startDate || null,
        endDate: editing.endDate || null,
      }),
    });
    const json = await res.json();
    if (!json.ok) return setState({ saving: false, error: json.error });
    setEditing(null);
    setState({ saving: false });
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl">Coupons</h1>
        <button className="admin-btn" onClick={openNew}>+ New Coupon</button>
      </div>

      {state.error && <p className="mb-4 border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{state.error}</p>}

      {editing && (
        <form onSubmit={save} className="admin-card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="admin-label">Code *</label>
            <input required className="admin-input uppercase" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className="admin-label">Type</label>
            <select className="admin-input" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (Rs.)</option>
              <option value="FREE_SHIPPING">Free Shipping</option>
            </select>
          </div>
          {editing.type !== "FREE_SHIPPING" && (
            <div>
              <label className="admin-label">Amount</label>
              <input type="number" min="0" className="admin-input" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} />
            </div>
          )}
          <div>
            <label className="admin-label">Min Order (Rs.)</label>
            <input type="number" min="0" className="admin-input" placeholder="Optional" value={editing.minOrderAmount} onChange={(e) => setEditing({ ...editing, minOrderAmount: e.target.value })} />
          </div>
          {editing.type === "PERCENTAGE" && (
            <div>
              <label className="admin-label">Max Discount Cap (Rs.)</label>
              <input type="number" min="0" className="admin-input" placeholder="Optional" value={editing.maxDiscount} onChange={(e) => setEditing({ ...editing, maxDiscount: e.target.value })} />
            </div>
          )}
          <div><label className="admin-label">Start Date</label><input type="date" className="admin-input" value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} /></div>
          <div><label className="admin-label">End Date</label><input type="date" className="admin-input" value={editing.endDate} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} /></div>
          <div><label className="admin-label">Total Usage Limit</label><input type="number" min="1" className="admin-input" placeholder="Unlimited" value={editing.usageLimit} onChange={(e) => setEditing({ ...editing, usageLimit: e.target.value })} /></div>
          <div><label className="admin-label">Uses Per Customer</label><input type="number" min="1" className="admin-input" placeholder="Unlimited" value={editing.usagePerCustomer} onChange={(e) => setEditing({ ...editing, usagePerCustomer: e.target.value })} /></div>
          <div>
            <label className="admin-label">Applies To</label>
            <select className="admin-input" value={editing.appliesTo} onChange={(e) => setEditing({ ...editing, appliesTo: e.target.value })}>
              <option value="ALL">Whole Order</option>
              <option value="PRODUCTS">Specific Products</option>
              <option value="CATEGORIES">Specific Categories</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="admin-label">Description</label>
            <input className="admin-input" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>

          {editing.appliesTo === "PRODUCTS" && (
            <div className="max-h-40 space-y-1 overflow-y-auto border border-line bg-white p-3 sm:col-span-2 lg:col-span-4">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-ink" checked={editing.productIds.includes(p.id)}
                    onChange={(e) => setEditing({ ...editing, productIds: e.target.checked ? [...editing.productIds, p.id] : editing.productIds.filter((x: string) => x !== p.id) })} />
                  {p.name}
                </label>
              ))}
            </div>
          )}
          {editing.appliesTo === "CATEGORIES" && (
            <div className="flex flex-wrap gap-3 border border-line bg-white p-3 sm:col-span-2 lg:col-span-4">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-ink" checked={editing.categoryIds.includes(c.id)}
                    onChange={(e) => setEditing({ ...editing, categoryIds: e.target.checked ? [...editing.categoryIds, c.id] : editing.categoryIds.filter((x: string) => x !== c.id) })} />
                  {c.name}
                </label>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-ink" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Active
          </label>
          <div className="flex gap-3 sm:col-span-2 lg:col-span-3">
            <button disabled={state.saving} className="admin-btn">{state.saving ? <Spinner /> : editing.id ? "Save Changes" : "Create Coupon"}</button>
            <button type="button" className="admin-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admin-card overflow-x-auto p-0">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-line bg-off">
              <th className="admin-th">Code</th><th className="admin-th">Benefit</th><th className="admin-th">Conditions</th>
              <th className="admin-th">Validity</th><th className="admin-th">Used</th><th className="admin-th">Status</th><th className="admin-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-off/50">
                <td className="admin-td">
                  <span className="border border-dashed border-ink/30 bg-off px-2 py-1 font-mono text-sm font-bold">{c.code}</span>
                  {c.description && <p className="mt-1 max-w-[220px] truncate text-xs text-ink/40">{c.description}</p>}
                </td>
                <td className="admin-td font-semibold">
                  {c.type === "PERCENTAGE" ? `${c.amount}% off` : c.type === "FIXED" ? `${formatMoney(c.amount)} off` : "Free Shipping"}
                  {c.maxDiscount ? <p className="text-xs font-normal text-ink/40">cap {formatMoney(c.maxDiscount)}</p> : null}
                </td>
                <td className="admin-td text-xs text-ink/60">
                  {c.minOrderAmount ? <>min {formatMoney(c.minOrderAmount)}<br /></> : null}
                  {c.appliesTo !== "ALL" ? `scope: ${c.appliesTo.toLowerCase()}` : "whole order"}
                </td>
                <td className="admin-td text-xs text-ink/60">
                  {c.startDate ? formatDate(c.startDate) : "—"} → {c.endDate ? formatDate(c.endDate) : "∞"}
                </td>
                <td className="admin-td">{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}</td>
                <td className="admin-td">
                  <span className={cn("badge", c.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500")}>{c.isActive ? "Active" : "Disabled"}</span>
                </td>
                <td className="admin-td text-right">
                  <div className="flex justify-end gap-3">
                    <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline" onClick={() => openEdit(c)}>Edit</button>
                    <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700 hover:underline" onClick={() => remove(c.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan={7} className="admin-td py-10 text-center text-ink/40">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
