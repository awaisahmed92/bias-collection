"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn, formatDateTime } from "@/lib/utils";

export default function InventoryClient({
  overview,
  lowStock,
  logs,
  searchParams,
}: {
  overview: { items: any[]; total: number; page: number; pages: number };
  lowStock: any[];
  logs: { items: any[]; total: number; page: number; pages: number };
  searchParams: Record<string, string>;
}) {
  const router = useRouter();
  const tab = searchParams.tab || "stock";
  const [adjusting, setAdjusting] = useState<{ productId: string; variantId?: string | null; name: string; current: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const setTab = (t: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", t);
    router.push(`/admin/inventory?${params}`);
  };

  const submitAdjust = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adjusting) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    let qty = Number(fd.get("quantity")) || 0;
    const type = String(fd.get("type"));
    if (type === "STOCK_DAMAGED") qty = -Math.abs(qty);
    await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: adjusting.productId, variantId: adjusting.variantId, type, quantity: qty, note: fd.get("note") }),
    });
    setBusy(false);
    setAdjusting(null);
    router.refresh();
  };

  return (
    <div>
      <h1 className="font-serif text-3xl">Inventory</h1>
      <div className="mb-5 mt-4 flex gap-1 border-b border-line">
        {[
          ["stock", "Stock Levels"],
          ["low", `Low Stock (${lowStock.length})`],
          ["logs", "Movement Log"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn("border-b-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em]", tab === k ? "border-ink text-ink" : "border-transparent text-ink/40")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* STOCK TAB */}
      {tab === "stock" && (
        <>
          <form method="GET" className="mb-4 flex gap-3">
            <input type="hidden" name="tab" value="stock" />
            <input name="q" defaultValue={searchParams.q} placeholder="Search product / SKU…" className="admin-input max-w-xs" />
            <button className="admin-btn-outline">Search</button>
          </form>
          <div className="admin-card overflow-x-auto p-0">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-line bg-off">
                  <th className="admin-th">Product / Variant</th><th className="admin-th">SKU</th>
                  <th className="admin-th">Stock</th><th className="admin-th">Reserved</th><th className="admin-th">Available</th>
                  <th className="admin-th text-right">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {overview.items.flatMap((p: any) => {
                  const rowSpan = Math.max(1, p.variants.length);
                  const productCell = (
                    <td className="admin-td" rowSpan={rowSpan}>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-10 shrink-0 overflow-hidden bg-sand">
                          {p.images[0]?.url && <img src={p.images[0].url} className="h-full w-full object-cover" alt="" />}
                        </div>
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-ink/40">{p.category.name}</p>
                        </div>
                      </div>
                    </td>
                  );
                  if (!p.variants.length)
                    return [
                      <tr key={p.id} className="hover:bg-off/50">
                        {productCell}
                        <td className="admin-td text-ink/50">{p.sku}</td>
                        <td className="admin-td font-semibold">{p.stock}</td>
                        <td className="admin-td text-ink/50">{p.reservedStock}</td>
                        <td className="admin-td font-semibold">{Math.max(0, p.stock - p.reservedStock)}</td>
                        <td className="admin-td text-right">
                          <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline" onClick={() => setAdjusting({ productId: p.id, name: p.name, current: p.stock })}>Adjust</button>
                        </td>
                      </tr>,
                    ];
                  return p.variants.map((v: any, i: number) => (
                    <tr key={v.id} className="hover:bg-off/50">
                      {i === 0 ? productCell : null}
                      <td className="admin-td text-ink/50">{v.sku} {[v.size, v.color].filter(Boolean).length > 0 && <span className="ml-1 text-ink/70">({[v.size, v.color].filter(Boolean).join("/")})</span>}</td>
                      <td className="admin-td font-semibold">{v.stock}</td>
                      <td className="admin-td text-ink/50">{v.reservedStock}</td>
                      <td className="admin-td font-semibold">{Math.max(0, v.stock - v.reservedStock)}</td>
                      <td className="admin-td text-right">
                        <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline" onClick={() => setAdjusting({ productId: p.id, variantId: v.id, name: `${p.name} (${[v.size, v.color].filter(Boolean).join("/")})`, current: v.stock })}>Adjust</button>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* LOW STOCK TAB */}
      {tab === "low" && (
        <div className="admin-card overflow-x-auto p-0">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-line bg-off">
                <th className="admin-th">Product</th><th className="admin-th">SKU</th><th className="admin-th">Stock</th><th className="admin-th">Threshold</th><th className="admin-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lowStock.map((l, i) => (
                <tr key={i}>
                  <td className="admin-td font-semibold">{l.name}{l.variantName ? ` — ${l.variantName}` : ""}</td>
                  <td className="admin-td text-ink/50">{l.sku}</td>
                  <td className="admin-td font-semibold">{l.stock}</td>
                  <td className="admin-td text-ink/50">{l.threshold}</td>
                  <td className="admin-td"><span className={cn("badge", l.level === "OUT" ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-800")}>{l.level === "OUT" ? "Out of Stock" : "Low"}</span></td>
                </tr>
              ))}
              {lowStock.length === 0 && <tr><td colSpan={5} className="admin-td py-10 text-center text-ink/40">All stock levels healthy ✓</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* LOGS TAB */}
      {tab === "logs" && (
        <div className="admin-card overflow-x-auto p-0">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-line bg-off">
                <th className="admin-th">When</th><th className="admin-th">Product</th><th className="admin-th">Type</th>
                <th className="admin-th">Qty</th><th className="admin-th">Before → After</th><th className="admin-th">Reference</th><th className="admin-th">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.items.map((l: any) => (
                <tr key={l.id}>
                  <td className="admin-td text-ink/50">{formatDateTime(l.createdAt)}</td>
                  <td className="admin-td">{l.product.name}{l.variant ? ` (${[l.variant.size, l.variant.color].filter(Boolean).join("/")})` : ""}</td>
                  <td className="admin-td"><span className="badge bg-slate-100 text-slate-700">{l.type.replace(/_/g, " ")}</span></td>
                  <td className={cn("admin-td font-semibold", l.quantity > 0 ? "text-emerald-700" : "text-rose-600")}>{l.quantity > 0 ? `+${l.quantity}` : l.quantity}</td>
                  <td className="admin-td text-ink/50">{l.before} → {l.after}</td>
                  <td className="admin-td text-ink/50">{l.reference ?? "—"}{l.note ? ` · ${l.note}` : ""}</td>
                  <td className="admin-td text-ink/50">{l.createdBy ? `${l.createdBy.firstName} ${l.createdBy.lastName}` : "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* adjust modal */}
      {adjusting && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setAdjusting(null)} />
          <form onSubmit={submitAdjust} className="relative w-full max-w-md border border-line bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-xl">Adjust Stock</h3>
            <p className="mt-1 text-sm text-ink/60">{adjusting.name} — current: <b>{adjusting.current}</b></p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="admin-label">Movement Type</label>
                <select name="type" className="admin-input">
                  <option value="STOCK_ADDED">Stock Added (+)</option>
                  <option value="STOCK_DAMAGED">Stock Damaged (−)</option>
                  <option value="STOCK_RETURNED">Stock Returned (+)</option>
                  <option value="MANUAL_ADJUSTMENT">Manual Adjustment (±)</option>
                </select>
              </div>
              <div><label className="admin-label">Quantity</label><input name="quantity" type="number" required className="admin-input" defaultValue="1" /></div>
              <div><label className="admin-label">Note</label><input name="note" className="admin-input" placeholder="e.g. New shipment arrived" /></div>
            </div>
            <div className="mt-5 flex gap-3">
              <button disabled={busy} className="admin-btn">{busy ? "…" : "Apply Adjustment"}</button>
              <button type="button" className="admin-btn-outline" onClick={() => setAdjusting(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
