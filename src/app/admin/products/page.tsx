import Link from "next/link";
import { requireAuth } from "@/lib/auth-helpers";
import { adminListProducts } from "@/services/product.service";
import ArchiveProductButton from "@/components/admin/ArchiveProductButton";
import { formatMoney, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: Record<string, string> }) {
  await requireAuth();
  const { items, total, page, pages } = await adminListProducts({
    q: searchParams.q,
    status: searchParams.status,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  const pageHref = (p: number) => {
    const params = new URLSearchParams(searchParams as any);
    params.set("page", String(p));
    return `/admin/products?${params}`;
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Products</h1>
          <p className="text-sm text-ink/50">{total} total</p>
        </div>
        <Link href="/admin/products/new" className="admin-btn">+ New Product</Link>
      </div>

      <form className="mb-4 flex flex-wrap gap-3" method="GET">
        <input name="q" defaultValue={searchParams.q} placeholder="Search name / SKU / brand…" className="admin-input max-w-xs" />
        <select name="status" defaultValue={searchParams.status || "ALL"} className="admin-input max-w-[160px]">
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button className="admin-btn-outline">Filter</button>
      </form>

      <div className="admin-card overflow-x-auto p-0">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-line bg-off">
              <th className="admin-th">Product</th>
              <th className="admin-th">Category</th>
              <th className="admin-th">Price</th>
              <th className="admin-th">Stock</th>
              <th className="admin-th">Status</th>
              <th className="admin-th">Flags</th>
              <th className="admin-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((p: any) => {
              const low = p.totalStock <= p.lowStockThreshold;
              return (
                <tr key={p.id} className="hover:bg-off/50">
                  <td className="admin-td">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-10 shrink-0 overflow-hidden bg-sand">
                        {p.images[0]?.url && <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div>
                        <Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
                        <p className="text-xs text-ink/40">{p.sku} · {p.variants.length} variant(s)</p>
                      </div>
                    </div>
                  </td>
                  <td className="admin-td text-ink/60">{p.category.name}</td>
                  <td className="admin-td">
                    <span className="font-semibold">{formatMoney(p.salePrice ?? p.originalPrice)}</span>
                    {p.salePrice && <span className="ml-1.5 text-xs text-ink/40 line-through">{formatMoney(p.originalPrice)}</span>}
                  </td>
                  <td className="admin-td">
                    <span className={cn("font-semibold", p.totalStock === 0 ? "text-rose-600" : low ? "text-amber-600" : "")}>{p.totalStock}</span>
                  </td>
                  <td className="admin-td">
                    <span className={cn("badge", p.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : p.status === "DRAFT" ? "bg-slate-100 text-slate-600" : "bg-ink/10 text-ink/50")}>{p.status}</span>
                  </td>
                  <td className="admin-td">
                    <div className="flex gap-1">
                      {p.isFeatured && <span className="badge bg-gold/15 text-gold">F</span>}
                      {p.isNewArrival && <span className="badge bg-ink/10 text-ink">N</span>}
                      {p.isBestSeller && <span className="badge bg-clay/20 text-claydark">B</span>}
                    </div>
                  </td>
                  <td className="admin-td text-right">
                    <div className="flex justify-end gap-3">
                      <Link href={`/product/${p.slug}`} target="_blank" className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/50 hover:underline">View</Link>
                      <Link href={`/admin/products/${p.id}`} className="text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline">Edit</Link>
                      <ArchiveProductButton id={p.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={7} className="admin-td py-10 text-center text-ink/40">No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <Link key={i} href={pageHref(i + 1)} className={cn("border px-3 py-1.5 text-xs font-semibold", page === i + 1 ? "border-ink bg-ink text-cream" : "border-line bg-white")}>
              {i + 1}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
