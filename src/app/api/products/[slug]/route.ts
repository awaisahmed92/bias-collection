import { handle, ok, fail } from "@/lib/api";
import { getProductBySlug } from "@/services/product.service";

export const GET = handle(async (_req: Request, { params }: { params: { slug: string } }) => {
  const product = await getProductBySlug(params.slug);
  if (!product || product.status !== "ACTIVE") return fail("Product not found.", 404);
  return ok({ product });
});
