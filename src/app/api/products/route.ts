import { handle, ok } from "@/lib/api";
import { listProducts, type ProductFilters } from "@/services/product.service";

export const GET = handle(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const filters: ProductFilters = {
    q: sp.get("q") || undefined,
    categorySlug: sp.get("category") || undefined,
    minPrice: sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined,
    maxPrice: sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined,
    size: sp.get("size") || undefined,
    color: sp.get("color") || undefined,
    inStock: sp.get("inStock") === "1" || undefined,
    onSale: sp.get("onSale") === "1" || undefined,
    isNew: sp.get("isNew") === "1" || undefined,
    isFeatured: sp.get("isFeatured") === "1" || undefined,
    bestSelling: sp.get("sort") === "best",
    sort: (sp.get("sort") as any) || "newest",
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    limit: sp.get("limit") ? Math.min(60, Number(sp.get("limit"))) : 12,
  };
  return ok(await listProducts(filters));
});
