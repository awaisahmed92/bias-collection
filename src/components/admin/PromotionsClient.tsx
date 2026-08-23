"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/primitives";
import { cn, formatDate } from "@/lib/utils";

type Promo = any;

const TYPES = [
  ["STORE_WIDE", "Store-Wide Sale"],
  ["CATEGORY", "Category Sale"],
  ["PRODUCT", "Product Sale"],
  ["FLASH", "Flash Sale"],
  ["BUY_X_GET_Y", "Buy X Get Y"],
  ["FREE_SHIPPING", "Free Shipping Promo"],
];

export default function PromotionsClient({
  promotions,
  products,
  categories,
}: {
  promotions: Promo[];
  products: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<any | null>(null);
  const [state, setState] = useState<{ saving: boolean; error?: string }>({ saving: false });

  const toLocal = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 16) : "");

  const openNew = () =>
    setEditing({
      name: "", description: "", type: "STORE_WIDE", discountType: "PERCENTAGE", discountValue: 10,
      configJson: "{}", startDate: "", endDate: "", isActive: true, priority: 0, productIds: [] as string[], categoryIds: [] as string[],
    });

  const openEdit = (p: Promo) =>
    setEditing({
      id: p.id, name: p.name, description: p.description ?? "", type: p.type, discountType: p.discountType,
      discountValue: p.discountValue, configJson: p.configJson ?? "{}", startDate: toLocal(p.startDate), endDate: toLocal(p.endDate),
      isActive: p.isActive, priority: p.priority,
      productIds: p.products.map((x: any) => x.productId), categoryIds: p.categories.map((x: any) => x.categoryId),
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ saving: true });
    const res = await fetch("/api/admin/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const json = await res.json();
    if (!json.ok) return setState({ saving: false, error: json.error });
    setEditing(null);
    setState({ saving: false });
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this promotion?")) return;
    await fetch(`/api/admin/promotions?id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  const needsProducts = editing && ["PRODUCT", "FLASH", "BUY_X_GET_Y"].includes(editing.type);
  const needsCategories = editing?.type === "CATEGORY";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Sales & Promotions</h1>
          <p className="text-sm text-ink/50">Priority: Product/Flash → Category → Store-wide → Coupon (no double discounts)</p>
        </div>
        <button className="admin-btn" onClick={openNew}>+ New Promotion</button>
      </div>

      {state.error && <p className="mb-4 border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{state.error}</p>}

      {editing && (
        <form onSubmit={save} className="admin-card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="admin-label">Name *</label>
            <input required className="admin-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div>
            <label className="admin-label">Type</label>
            <select className="admin-input" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {editing.type !== "FREE_SHIPPING" && (
            <>
              <div>
                <label className="admin-label">Discount Type</label>
                <select className="admin-input" value={editing.discountType} onChange={(e) => setEditing({ ...editing, discountType: e.target.value })}>
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (Rs.)</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Discount Value</label>
                <input type="number" min="0" className="admin-input" value={editing.discountValue} onChange={(e) => setEditing({ ...editing, discountValue: Number(e.target.value) })} />
              </div>
            </>
          )}
          {editing.type === "FREE_SHIPPING" && (
            <div>
              <label className="admin-label">Free above (Rs., 0 = always)</label>
              <input type="number" min="0" className="admin-input" value={editing.discountValue} onChange={(e) => setEditing({ ...editing, discountValue: Number(e.target.value) })} />
            </div>
          )}
          {editing.type === "BUY_X_GET_Y" && (
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="admin-label">Config (Buy / Get)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm">Buy</span>
                <input
                  type="number" min="1" className="admin-input w-20"
                  value={JSON.parse(editing.configJson || "{}").buy ?? 2}
                  onChange={(e) => setEditing({ ...editing, configJson: JSON.stringify({ ...JSON.parse(editing.configJson || "{}"), buy: Number(e.target.value) }) })}
                />
                <span className="text-sm">Get</span>
                <input
                  type="number" min="1" className="admin-input w-20"
                  value={JSON.parse(editing.configJson || "{}").get ?? 1}
                  onChange={(e) => setEditing({ ...editing, configJson: JSON.stringify({ ...JSON.parse(editing.configJson || "{}"), get: Number(e.target.value) }) })}
                />
                <span className="text-sm">free</span>
              </div>
            </div>
          )}
          <div>
            <label className="admin-label">Start</label>
            <input type="datetime-local" className="admin-input" value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} />
          </div>
          <div>
            <label className="admin-label">End</label>
            <input type="datetime-local" className="admin-input" value={editing.endDate} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} />
          </div>
          <div>
            <label className="admin-label">Priority (higher wins)</label>
            <input type="number" className="admin-input" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} />
          </div>

          {needsProducts && (
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="admin-label">Products</label>
              <div className="max-h-40 space-y-1 overflow-y-auto border border-line bg-white p-3">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox" className="h-4 w-4 accent-ink"
                      checked={editing.productIds.includes(p.id)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          productIds: e.target.checked ? [...editing.productIds, p.id] : editing.productIds.filter((x: string) => x !== p.id),
                        })
                      }
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {needsCategories && (
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="admin-label">Categories</label>
              <div className="flex flex-wrap gap-3 border border-line bg-white p-3">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox" className="h-4 w-4 accent-ink"
                      checked={editing.categoryIds.includes(c.id)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          categoryIds: e.target.checked ? [...editing.categoryIds, c.id] : editing.categoryIds.filter((x: string) => x !== c.id),
                        })
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="admin-label">Description</label>
            <input className="admin-input" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" className="h-4 w-4 accent-ink" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Active
          </label>

          <div className="flex gap-3 sm:col-span-2 lg:col-span-3">
            <button disabled={state.saving} className="admin-btn">{state.saving ? <Spinner /> : editing.id ? "Save Changes" : "Create Promotion"}</button>
            <button type="button" className="admin-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {promotions.map((p) => (
          <div key={p.id} className="admin-card flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-semibold">{p.name}</p>
                <span className={cn("badge", p.live ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500")}>{p.live ? "LIVE" : p.isActive ? "Scheduled" : "Inactive"}</span>
                <span className="badge bg-ink/10 text-ink/70">{p.type.replace(/_/g, " ")}</span>
              </div>
              <p className="mt-1 text-sm text-ink/60">
                {p.type === "BUY_X_GET_Y"
                  ? (() => { try { const c = JSON.parse(p.configJson); return `Buy ${c.buy} get ${c.get} free`; } catch { return "Buy X Get Y"; } })()
                  : p.type === "FREE_SHIPPING"
                    ? p.discountValue > 0 ? `Free shipping over Rs. ${p.discountValue.toLocaleString()}` : "Free shipping on all orders"
                    : p.discountType === "PERCENTAGE" ? `${p.discountValue}% off` : `Rs. ${p.discountValue.toLocaleString()} off`}
                {(p.products.length > 0 || p.categories.length > 0) && (
                  <> · {[...p.products.map((x: any) => x.product.name), ...p.categories.map((x: any) => x.category.name)].join(", ")}</>
                )}
              </p>
              <p className="mt-0.5 text-xs text-ink/40">
                {p.startDate ? formatDate(p.startDate) : "Anytime"} → {p.endDate ? formatDate(p.endDate) : "No end"} · priority {p.priority}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline" onClick={() => openEdit(p)}>Edit</button>
              <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700 hover:underline" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </div>
        ))}
        {promotions.length === 0 && <p className="text-sm text-ink/40">No promotions yet.</p>}
      </div>
    </div>
  );
}
