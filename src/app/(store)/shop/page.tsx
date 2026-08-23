import { Suspense } from "react";
import { listProducts, getFilterMeta } from "@/services/product.service";
import FilterBar, { SortSelect } from "@/components/store/FilterBar";
import ProductGrid from "@/components/store/ProductGrid";
import Pagination from "@/components/store/Pagination";
import { EmptyState } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata = { title: "Shop All" };

export default async function ShopPage({ searchParams }: { searchParams: Record<string, string> }) {
  const [meta, result] = await Promise.all([
    getFilterMeta(),
    listProducts({
      q: searchParams.q,
      categorySlug: searchParams.category,
      minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
      maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
      size: searchParams.size,
      color: searchParams.color,
      inStock: searchParams.inStock === "1",
      onSale: searchParams.onSale === "1",
      isNew: searchParams.isNew === "1",
      sort: (searchParams.sort as any) || "newest",
      page: searchParams.page ? Number(searchParams.page) : 1,
      limit: 12,
    }),
  ]);

  const buildHref = (p: number) => {
    const params = new URLSearchParams(searchParams as any);
    params.set("page", String(p));
    return `/shop?${params.toString()}`;
  };

  return (
    <div className="container-x py-10">
      <header className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink/40">
          {searchParams.q ? `Search results for "${searchParams.q}"` : "The Collection"}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">
          {searchParams.category
            ? meta.categories.find((c) => c.slug === searchParams.category)?.name ??
              meta.categories.flatMap((c) => c.children).find((c: any) => c.slug === searchParams.category)?.name ??
              "Shop"
            : searchParams.onSale === "1"
              ? "Sale"
              : searchParams.isNew === "1"
                ? "New Arrivals"
                : "Shop All"}
        </h1>
        <p className="mt-2 text-sm text-ink/50">{result.total} {result.total === 1 ? "piece" : "pieces"}</p>
      </header>

      <div className="flex gap-10">
        <Suspense>
          <FilterBar meta={meta} />
        </Suspense>
        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <span className="hidden text-xs text-ink/50 sm:block">
              Showing page {result.page} of {result.pages}
            </span>
            <Suspense>
              <SortSelect />
            </Suspense>
          </div>
          {result.items.length ? (
            <>
              <ProductGrid products={result.items} cols={3} />
              <Pagination page={result.page} pages={result.pages} buildHref={buildHref} />
            </>
          ) : (
            <EmptyState title="Nothing matched those filters" hint="Try widening your search or clearing filters." />
          )}
        </div>
      </div>
    </div>
  );
}
