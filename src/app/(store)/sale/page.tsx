import { listProducts } from "@/services/product.service";
import { getActivePromotions } from "@/services/discount.service";
import ProductGrid from "@/components/store/ProductGrid";
import Pagination from "@/components/store/Pagination";
import { EmptyState } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sale" };

export default async function SalePage({ searchParams }: { searchParams: Record<string, string> }) {
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const [result, promos] = await Promise.all([listProducts({ onSale: true, page, limit: 12 }), getActivePromotions()]);
  const live = promos.filter((p) => ["STORE_WIDE", "CATEGORY", "PRODUCT", "FLASH"].includes(p.type));
  return (
    <div className="container-x py-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-rose-700">Limited Time</p>
      <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">Sale</h1>
      {live.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {live.map((p) => (
            <span key={p.id} className="border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800">
              {p.name}
              {p.discountType === "PERCENTAGE" ? ` — ${p.discountValue}% off` : p.discountType === "FIXED" ? ` — Rs. ${p.discountValue} off` : ""}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-sm text-ink/50">{result.total} pieces on offer</p>
      <div className="mt-8">
        {result.items.length ? (
          <>
            <ProductGrid products={result.items} />
            <Pagination page={result.page} pages={result.pages} buildHref={(p) => `/sale?page=${p}`} />
          </>
        ) : (
          <EmptyState title="No active sale right now" hint="Check back soon — or browse the full collection." />
        )}
      </div>
    </div>
  );
}
