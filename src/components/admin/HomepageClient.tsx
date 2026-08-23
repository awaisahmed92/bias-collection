"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ImagePicker from "./ImagePicker";
import { Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const SECTION_TYPES = [
  ["HERO", "Hero Section"],
  ["CATEGORY_GRID", "Featured Categories"],
  ["NEW_ARRIVALS", "New Arrivals"],
  ["FEATURED_PRODUCTS", "Featured Products"],
  ["PROMO_BANNER", "Promotional Banner"],
  ["BEST_SELLERS", "Best Sellers"],
  ["SALE_BANNER", "Sale Banner"],
  ["NEWSLETTER", "Newsletter"],
];

export default function HomepageClient({
  sections,
  products,
  categories,
}: {
  sections: any[];
  products: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const parseCfg = (s: any) => {
    try { return { productIds: [], categoryIds: [], maxItems: 8, ...JSON.parse(s.configJson || "{}") }; } catch { return { productIds: [], categoryIds: [], maxItems: 8 }; }
  };

  const save = async (section: any, patch: any = {}) => {
    setBusyId(section.id);
    await fetch("/api/admin/homepage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: section.id, ...section, configJson: typeof section.configJson === "string" ? section.configJson : JSON.stringify(section.configJson), ...patch }),
    });
    setBusyId(null);
    router.refresh();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const other = index + dir;
    if (other < 0 || other >= sections.length) return;
    const a = sections[index], b = sections[other];
    await save(a, { displayOrder: b.displayOrder });
    await save(b, { displayOrder: a.displayOrder });
    router.refresh();
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cfg = {
      productIds: editing.cfg.productIds ?? [],
      categoryIds: editing.cfg.categoryIds ?? [],
      maxItems: Number(editing.cfg.maxItems) || 8,
    };
    await fetch("/api/admin/homepage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        type: editing.type,
        title: editing.title || null,
        subtitle: editing.subtitle || null,
        image: editing.image || null,
        buttonText: editing.buttonText || null,
        buttonLink: editing.buttonLink || null,
        configJson: JSON.stringify(cfg),
        displayOrder: editing.displayOrder,
        isActive: editing.isActive,
      }),
    });
    setEditing(null);
    router.refresh();
  };

  const hasProductPicker = (t: string) => ["NEW_ARRIVALS", "FEATURED_PRODUCTS", "BEST_SELLERS"].includes(t);

  return (
    <div>
      <div className="mb-2">
        <h1 className="font-serif text-3xl">Homepage Builder</h1>
        <p className="text-sm text-ink/50">Reorder, edit and toggle every section of the storefront homepage — no code needed.</p>
      </div>

      <div className="mt-6 space-y-3">
        {sections.map((s, idx) => {
          const cfg = parseCfg(s);
          return (
            <div key={s.id} className={cn("admin-card flex flex-wrap items-center gap-4", !s.isActive && "opacity-55")}>
              <div className="flex flex-col">
                <button aria-label="Move up" disabled={idx === 0 || busyId === s.id} className="text-ink/40 hover:text-ink disabled:opacity-30" onClick={() => move(idx, -1)}>▲</button>
                <button aria-label="Move down" disabled={idx === sections.length - 1 || busyId === s.id} className="text-ink/40 hover:text-ink disabled:opacity-30" onClick={() => move(idx, 1)}>▼</button>
              </div>
              <span className="w-6 text-center font-serif text-lg text-ink/30">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{s.title || SECTION_TYPES.find(([v]) => v === s.type)?.[1]}</p>
                  <span className="badge bg-ink/10 text-ink/60">{s.type.replace(/_/g, " ")}</span>
                  {hasProductPicker(s.type) && cfg.productIds?.length > 0 && <span className="badge bg-gold/15 text-gold">Manual: {cfg.productIds.length} products</span>}
                </div>
                <p className="truncate text-xs text-ink/40">{s.subtitle}</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink/60">
                <input
                  type="checkbox" className="h-4 w-4 accent-ink" checked={s.isActive} disabled={busyId === s.id}
                  onChange={(e) => save(s, { isActive: e.target.checked })}
                />
                Visible
              </label>
              <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline" onClick={() => setEditing({ ...s, cfg })}>
                {busyId === s.id ? <Spinner className="h-3 w-3" /> : "Edit"}
              </button>
            </div>
          );
        })}
      </div>

      {/* editor drawer */}
      {editing && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setEditing(null)} />
          <form onSubmit={saveEdit} className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-xl">Edit: {SECTION_TYPES.find(([v]) => v === editing.type)?.[1]}</h2>
              <button type="button" onClick={() => setEditing(null)} className="text-2xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div><label className="admin-label">Heading</label><input className="admin-input" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><label className="admin-label">Subheading</label><input className="admin-input" value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="admin-label">Button Text</label><input className="admin-input" value={editing.buttonText ?? ""} onChange={(e) => setEditing({ ...editing, buttonText: e.target.value })} /></div>
                <div><label className="admin-label">Button Link</label><input className="admin-input" value={editing.buttonLink ?? ""} onChange={(e) => setEditing({ ...editing, buttonLink: e.target.value })} /></div>
              </div>

              {["PROMO_BANNER", "SALE_BANNER", "HERO"].includes(editing.type) && (
                <ImagePicker label="Image" value={editing.image ?? ""} onChange={(url) => setEditing({ ...editing, image: url })} folder="homepage" />
              )}

              {(hasProductPicker(editing.type) || editing.type === "CATEGORY_GRID") && (
                <div>
                  <label className="admin-label">Max Items (auto mode)</label>
                  <input type="number" min="1" max="16" className="admin-input w-32" value={editing.cfg.maxItems ?? 8} onChange={(e) => setEditing({ ...editing, cfg: { ...editing.cfg, maxItems: e.target.value } })} />
                </div>
              )}

              {hasProductPicker(editing.type) && (
                <div>
                  <label className="admin-label">Manual product selection (overrides automatic rules)</label>
                  <div className="max-h-56 space-y-1 overflow-y-auto border border-line bg-white p-3">
                    {products.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox" className="h-4 w-4 accent-ink"
                          checked={(editing.cfg.productIds ?? []).includes(p.id)}
                          onChange={(e) => {
                            const cur = editing.cfg.productIds ?? [];
                            setEditing({ ...editing, cfg: { ...editing.cfg, productIds: e.target.checked ? [...cur, p.id] : cur.filter((x: string) => x !== p.id) } });
                          }}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-ink/40">{(editing.cfg.productIds ?? []).length} selected · 0 = automatic (rules-based)</p>
                </div>
              )}

              {editing.type === "CATEGORY_GRID" && (
                <div>
                  <label className="admin-label">Categories (none selected = top-level auto)</label>
                  <div className="space-y-1 border border-line bg-white p-3">
                    {categories.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox" className="h-4 w-4 accent-ink"
                          checked={(editing.cfg.categoryIds ?? []).includes(c.id)}
                          onChange={(e) => {
                            const cur = editing.cfg.categoryIds ?? [];
                            setEditing({ ...editing, cfg: { ...editing.cfg, categoryIds: e.target.checked ? [...cur, c.id] : cur.filter((x: string) => x !== c.id) } });
                          }}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-ink" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Visible on homepage
              </label>

              <div className="flex gap-3 pt-2">
                <button className="admin-btn">Save Section</button>
                <button type="button" className="admin-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
