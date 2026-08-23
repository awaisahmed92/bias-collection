import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import { listAllFlat, createCategory } from "@/services/category.service";

export const GET = handle(async () => {
  const auth = await requirePermission("categories.manage");
  if ("response" in auth) {
    // categories are needed by product form too — allow any staff with products.* access
    const { requirePermission: rp } = await import("@/lib/api");
    const a2 = await rp("products.view");
    if ("response" in a2) return a2.response;
  }
  return ok({ categories: await listAllFlat(true) });
});

export const POST = handle(async (req: Request) => {
  const auth = await requirePermission("categories.manage");
  if ("response" in auth) return auth.response;
  try {
    const category = await createCategory(await req.json());
    await audit(auth.session.id, "create", "category", category.id, category.name);
    return ok({ category });
  } catch (e: any) {
    if (e?.name === "ZodError") throw e;
    return fail(e.message, 400);
  }
});
