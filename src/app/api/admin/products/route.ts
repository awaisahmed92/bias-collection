import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import { adminListProducts, createProduct } from "@/services/product.service";

export const GET = handle(async (req: Request) => {
  const auth = await requirePermission("products.view");
  if ("response" in auth) return auth.response;
  const sp = new URL(req.url).searchParams;
  return ok(
    await adminListProducts({
      q: sp.get("q") || undefined,
      status: sp.get("status") || undefined,
      page: sp.get("page") ? Number(sp.get("page")) : 1,
    })
  );
});

export const POST = handle(async (req: Request) => {
  const auth = await requirePermission("products.create");
  if ("response" in auth) return auth.response;
  try {
    const product = await createProduct(await req.json(), auth.session.id);
    await audit(auth.session.id, "create", "product", product.id, product.name);
    return ok({ product });
  } catch (e: any) {
    if (e?.name === "ZodError") throw e;
    return fail(e.message || "Could not create product.", 400);
  }
});
