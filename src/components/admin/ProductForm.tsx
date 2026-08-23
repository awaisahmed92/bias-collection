"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ImagePicker from "./ImagePicker";
import { Spinner } from "@/components/ui/primitives";
import { IconTrash } from "@/components/ui/icons";

type Variant = {
  id?: string; size: string; color: string; sku: string; price: string; salePrice: string; stock: string; isActive: boolean;
};
type Props = {
  categories: { id: string; name: string; parent: { name: string } | null }[];
  initial?: any;
};

const newVariant = (skuPrefix: string): Variant => ({ size: "", color: "", sku: `${skuPrefix}-`, price: "", salePrice: "", stock: "0", isActive: true });

export default function ProductForm({ categories, initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [f, setF] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    shortDescription: initial?.shortDescription ?? "",
    description: initial?.description ?? "",
    sku: initial?.sku ?? "",
    barcode: initial?.barcode ?? "",
    brand: initial?.brand ?? "Bias Collection",
    categoryId: initial?.categoryId ?? "",
    tags: initial?.tags ?? "",
    originalPrice: initial ? String(initial.originalPrice) : "",
    salePrice: initial?.salePrice != null ? String(initial.salePrice) : "",
    costPrice: initial?.costPrice != null ? String(initial.costPrice) : "",
    stock: initial ? String(initial.stock) : "0",
    lowStockThreshold: initial ? String(initial.lowStockThreshold) : "5",
    status: initial?.status ?? "ACTIVE",
    isFeatured: initial?.isFeatured ?? false,
    isNewArrival: initial?.isNewArrival ?? false,
    isBestSeller: initial?.isBestSeller ?? false,
    allowBackorder: initial?.allowBackorder ?? false,
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
  });
  const [images, setImages] = useState<string[]>(initial?.images?.map((i: any) => i.url) ?? []);
  const [variants, setVariants] = useState<Variant[]>(
    initial?.variants?.map((v: any) => ({
      id: v.id, size: v.size ?? "", color: v.color ?? "", sku: v.sku,
      price: v.price != null ? String(v.price) : "", salePrice: v.salePrice != null ? String(v.salePrice) : "",
      stock: String(v.stock), isActive: v.isActive,
    })) ?? []
  );
  const [state, setState] = useState<{ saving: boolean; error?: string }>({ saving: false });

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ saving: true });
    const payload = {
      ...f,
      slug: f.slug || null,
      shortDescription: f.shortDescription || null,
      description: f.description || null,
      barcode: f.barcode || null,
      brand: f.brand || null,
      tags: f.tags || null,
      originalPrice: Number(f.originalPrice),
      salePrice: f.salePrice === "" ? null : Number(f.salePrice),
      costPrice: f.costPrice === "" ? null : Number(f.costPrice),
      stock: Number(f.stock) || 0,
      lowStockThreshold: Number(f.lowStockThreshold) || 0,
      seoTitle: f.seoTitle || null,
      seoDescription: f.seoDescription || null,
      images: images.filter(Boolean).map((url, i) => ({ url, sortOrder: i })),
      variants: variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        size: v.size || null,
        color: v.color || null,
        sku: v.sku,
        price: v.price === "" ? null : Number(v.price),
        salePrice: v.salePrice === "" ? null : Number(v.salePrice),
        stock: Number(v.stock) || 0,
        isActive: v.isActive,
      })),
    };
    const res = await fetch(isEdit ? `/api/admin/products/${initial.id}` : "/api/admin/products", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) {
      setState({ saving: false, error: json.error || "Validation failed." });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push("/admin/products");
    router.refresh();
  };

  const cats = categories.map((c) => ({ ...c, label: c.parent ? `${c.parent.name} → ${c.name}` : c.name }));

  return (
    <form onSubmit={submit} className="space-y-6">
      {state.error && <p className="border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{state.error}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* basics */}
          <section className="admin-card space-y-4">
            <h2 className="font-serif text-lg">Basics</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="admin-label">Product Name *</label>
                <input required className="admin-input" value={f.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Slug (auto if empty)</label>
                <input className="admin-input" value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="premium-oxford-shirt" />
              </div>
              <div>
                <label className="admin-label">Brand</label>
                <input className="admin-input" value={f.brand} onChange={(e) => set("brand", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="admin-label">Short Description</label>
                <input className="admin-input" value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="One-liner shown under the product name" />
              </div>
              <div className="sm:col-span-2">
                <label className="admin-label">Full Description</label>
                <textarea className="admin-input min-h-[140px]" value={f.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Category *</label>
                <select required className="admin-input" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">Select…</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-label">Tags (comma separated)</label>
                <input className="admin-input" value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="shirt, cotton, formal" />
              </div>
            </div>
          </section>

          {/* images */}
          <section className="admin-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg">Images</h2>
              <button type="button" className="admin-btn-outline !px-3 !py-1.5" onClick={() => setImages([...images, ""])}>+ Add Image</button>
            </div>
            {images.length === 0 && <p className="text-sm text-ink/40">No images yet — add at least one.</p>}
            <div className="space-y-4">
              {images.map((url, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="pt-2 text-xs font-bold text-ink/30">{i + 1}</span>
                  <div className="flex-1">
                    <ImagePicker value={url} onChange={(u) => setImages(images.map((x, j) => (j === i ? u : x)))} folder="products" />
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <button type="button" aria-label="Move up" className="text-xs" disabled={i === 0} onClick={() => { const c = [...images]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; setImages(c); }}>▲</button>
                    <button type="button" aria-label="Move down" className="text-xs" disabled={i === images.length - 1} onClick={() => { const c = [...images]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; setImages(c); }}>▼</button>
                    <button type="button" aria-label="Remove image" className="text-rose-600" onClick={() => setImages(images.filter((_, j) => j !== i))}>
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* variants */}
          <section className="admin-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg">Variants</h2>
                <p className="text-xs text-ink/40">Sizes / colors with their own SKU & stock. When variants exist, variant stock is used at checkout.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="admin-btn-outline !px-3 !py-1.5" onClick={() => setVariants([...variants, newVariant(f.sku || "SKU")])}>+ Add Variant</button>
                <button
                  type="button"
                  className="admin-btn-outline !px-3 !py-1.5"
                  onClick={() => {
                    const sizes = ["S", "M", "L", "XL"];
                    const existing = new Set(variants.map((v) => v.size));
                    setVariants([...variants, ...sizes.filter((s) => !existing.has(s)).map((s) => ({ ...newVariant(f.sku || "SKU"), sku: `${f.sku || "SKU"}-${s}`, size: s, stock: "10" }))]);
                  }}
                >
                  + Sizes S–XL
                </button>
              </div>
            </div>
            {variants.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="admin-th">Size</th><th className="admin-th">Color</th><th className="admin-th">SKU *</th>
                      <th className="admin-th">Price (opt)</th><th className="admin-th">Sale (opt)</th><th className="admin-th">Stock</th>
                      <th className="admin-th">Active</th><th className="admin-th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, i) => (
                      <tr key={i} className="border-b border-line/60">
                        {(["size", "color", "sku", "price", "salePrice", "stock"] as const).map((k) => (
                          <td key={k} className="p-1.5">
                            <input
                              className="admin-input !py-1.5"
                              value={v[k]}
                              type={k === "price" || k === "salePrice" || k === "stock" ? "number" : "text"}
                              required={k === "sku"}
                              onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                            />
                          </td>
                        ))}
                        <td className="p-1.5 text-center">
                          <input type="checkbox" className="h-4 w-4 accent-ink" checked={v.isActive} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, isActive: e.target.checked } : x)))} />
                        </td>
                        <td className="p-1.5">
                          <button type="button" aria-label="Remove variant" className="text-rose-600" onClick={() => setVariants(variants.filter((_, j) => j !== i))}>
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SEO */}
          <section className="admin-card space-y-4">
            <h2 className="font-serif text-lg">SEO</h2>
            <div>
              <label className="admin-label">SEO Title</label>
              <input className="admin-input" value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
            </div>
            <div>
              <label className="admin-label">SEO Description</label>
              <textarea className="admin-input" rows={2} value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
            </div>
          </section>
        </div>

        {/* right rail */}
        <div className="space-y-6">
          <section className="admin-card space-y-4">
            <h2 className="font-serif text-lg">Pricing</h2>
            <div><label className="admin-label">Original Price (Rs.) *</label><input required type="number" min="1" className="admin-input" value={f.originalPrice} onChange={(e) => set("originalPrice", e.target.value)} /></div>
            <div><label className="admin-label">Sale Price (Rs.)</label><input type="number" min="0" className="admin-input" value={f.salePrice} onChange={(e) => set("salePrice", e.target.value)} placeholder="Optional" /></div>
            <div><label className="admin-label">Cost Price (Rs.)</label><input type="number" min="0" className="admin-input" value={f.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="For margin reports" /></div>
            {Number(f.salePrice) > 0 && Number(f.salePrice) < Number(f.originalPrice) && (
              <p className="text-xs font-semibold text-emerald-700">Customer saves Rs. {(Number(f.originalPrice) - Number(f.salePrice)).toLocaleString()} ({Math.round((1 - Number(f.salePrice) / Number(f.originalPrice)) * 100)}%)</p>
            )}
          </section>

          <section className="admin-card space-y-4">
            <h2 className="font-serif text-lg">Inventory</h2>
            <div><label className="admin-label">SKU *</label><input required className="admin-input" value={f.sku} onChange={(e) => set("sku", e.target.value)} /></div>
            <div><label className="admin-label">Barcode</label><input className="admin-input" value={f.barcode} onChange={(e) => set("barcode", e.target.value)} /></div>
            {variants.length === 0 && (
              <div><label className="admin-label">Stock Quantity</label><input type="number" min="0" className="admin-input" value={f.stock} onChange={(e) => set("stock", e.target.value)} /></div>
            )}
            <div><label className="admin-label">Low Stock Threshold</label><input type="number" min="0" className="admin-input" value={f.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={f.allowBackorder} onChange={(e) => set("allowBackorder", e.target.checked)} /> Allow backorders</label>
          </section>

          <section className="admin-card space-y-3">
            <h2 className="font-serif text-lg">Visibility</h2>
            <div>
              <label className="admin-label">Status</label>
              <select className="admin-input" value={f.status} onChange={(e) => set("status", e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            {[
              ["isFeatured", "Featured product"],
              ["isNewArrival", "New arrival"],
              ["isBestSeller", "Best seller (manual override)"],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-ink" checked={(f as any)[k]} onChange={(e) => set(k, e.target.checked)} /> {label}
              </label>
            ))}
          </section>

          <div className="admin-card sticky top-20 space-y-3">
            <button disabled={state.saving} className="admin-btn w-full justify-center">
              {state.saving ? <Spinner /> : isEdit ? "Save Changes" : "Create Product"}
            </button>
            <button type="button" className="admin-btn-outline w-full justify-center" onClick={() => router.push("/admin/products")}>Cancel</button>
            {isEdit && (
              <a href={`/product/${initial.slug}`} target="_blank" className="block text-center text-[11px] font-bold uppercase tracking-[0.14em] text-claydark hover:underline">
                View on storefront ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
