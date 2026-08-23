"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn, formatMoney } from "@/lib/utils";
import { IconX } from "@/components/ui/icons";

type Meta = {
  categories: { id: string; name: string; slug: string; children: any[] }[];
  sizes: string[];
  colors: string[];
  priceMin: number;
  priceMax: number;
};

export default function FilterBar({ meta }: { meta: Meta }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);

  const get = (k: string) => sp.get(k) || "";
  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    params.delete("page");
    router.push(`/shop?${params.toString()}`);
    setOpen(false);
  };

  const activeCategory = get("category");
  const activeSize = get("size");
  const activeColor = get("color");

  const content = (
    <div className="space-y-8">
      {/* categories */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">Category</p>
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => setParams({ category: null })}
              className={cn("text-sm hover:text-ink", !activeCategory ? "font-bold text-ink" : "text-ink/60")}
            >
              All Products
            </button>
          </li>
          {meta.categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setParams({ category: c.slug === activeCategory ? null : c.slug })}
                className={cn("text-sm hover:text-ink", activeCategory === c.slug ? "font-bold text-ink" : "text-ink/70")}
              >
                {c.name}
              </button>
              <ul className="ml-3 mt-1 space-y-1">
                {c.children.map((s) => (
                  <li key={s.slug}>
                    <button
                      onClick={() => setParams({ category: s.slug === activeCategory ? null : s.slug })}
                      className={cn("text-[13px] hover:text-ink", activeCategory === s.slug ? "font-semibold text-ink" : "text-ink/50")}
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      {/* price */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">Price</p>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setParams({ minPrice: String(fd.get("min") || "") || null, maxPrice: String(fd.get("max") || "") || null });
          }}
        >
          <input name="min" type="number" placeholder={String(meta.priceMin)} defaultValue={get("minPrice")} className="input !py-2 !text-xs" />
          <span className="text-ink/40">—</span>
          <input name="max" type="number" placeholder={String(meta.priceMax)} defaultValue={get("maxPrice")} className="input !py-2 !text-xs" />
          <button className="btn-outline btn-sm">Go</button>
        </form>
      </div>

      {/* sizes */}
      {meta.sizes.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">Size</p>
          <div className="flex flex-wrap gap-2">
            {meta.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setParams({ size: s === activeSize ? null : s })}
                className={cn(
                  "border px-3 py-1.5 text-xs font-semibold transition-colors",
                  activeSize === s ? "border-ink bg-ink text-cream" : "border-line bg-white hover:border-ink"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* colors */}
      {meta.colors.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">Color</p>
          <div className="flex flex-wrap gap-2">
            {meta.colors.map((c) => (
              <button
                key={c}
                onClick={() => setParams({ color: c === activeColor ? null : c })}
                className={cn(
                  "border px-3 py-1.5 text-xs font-semibold transition-colors",
                  activeColor === c ? "border-ink bg-ink text-cream" : "border-line bg-white hover:border-ink"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* toggles */}
      <div className="space-y-2.5">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">Refine</p>
        {[
          { k: "onSale", label: "On Sale" },
          { k: "isNew", label: "New Arrivals" },
          { k: "inStock", label: "In Stock Only" },
        ].map((t) => (
          <label key={t.k} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={get(t.k) === "1"}
              onChange={(e) => setParams({ [t.k]: e.target.checked ? "1" : null })}
              className="h-4 w-4 accent-ink"
            />
            {t.label}
          </label>
        ))}
      </div>

      <button
        onClick={() => {
          router.push("/shop");
          setOpen(false);
        }}
        className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-700 hover:underline"
      >
        Clear all filters
      </button>
    </div>
  );

  return (
    <>
      {/* desktop */}
      <aside className="sticky top-32 hidden w-60 shrink-0 lg:block">{content}</aside>

      {/* mobile */}
      <button onClick={() => setOpen(true)} className="btn-outline btn-sm lg:hidden">
        Filters {(activeCategory || activeSize || activeColor || get("onSale") || get("isNew") || get("inStock")) && "•"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[85%] max-w-sm overflow-y-auto bg-cream p-6">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-[0.2em]">Filters</p>
              <button onClick={() => setOpen(false)} aria-label="Close filters"><IconX className="h-5 w-5" /></button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}

export function SortSelect() {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <select
      className="select !w-auto !py-2 !text-xs"
      value={sp.get("sort") || "newest"}
      onChange={(e) => {
        const params = new URLSearchParams(sp.toString());
        params.set("sort", e.target.value);
        params.delete("page");
        router.push(`/shop?${params.toString()}`);
      }}
    >
      <option value="newest">Newest</option>
      <option value="best">Best Selling</option>
      <option value="popular">Most Popular</option>
      <option value="price_asc">Price: Low → High</option>
      <option value="price_desc">Price: High → Low</option>
    </select>
  );
}
