import { listProducts } from "@/services/product.service";
import ProductGrid from "@/components/store/ProductGrid";
import Pagination from "@/components/store/Pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Arrivals" };

export default async function NewArrivalsPage({ searchParams }: { searchParams: Record<string, string> }) {
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const result = await listProducts({ isNew: true, page, limit: 12, sort: "newest" });
  return (
    <div className="container-x py-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink/40">Just Landed</p>
      <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">New Arrivals</h1>
      <p className="mt-2 text-sm text-ink/50">{result.total} fresh pieces</p>
      <div className="mt-8">
        <ProductGrid products={result.items} />
        <Pagination page={result.page} pages={result.pages} buildHref={(p) => `/new-arrivals?page=${p}`} />
      </div>
    </div>
  );
}
