import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import { updateCategory, deleteCategory } from "@/services/category.service";

type Ctx = { params: { id: string } };

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const auth = await requirePermission("categories.manage");
  if ("response" in auth) return auth.response;
  try {
    const category = await updateCategory(params.id, await req.json());
    await audit(auth.session.id, "update", "category", params.id, category.name);
    return ok({ category });
  } catch (e: any) {
    if (e?.name === "ZodError") throw e;
    return fail(e.message, 400);
  }
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const auth = await requirePermission("categories.manage");
  if ("response" in auth) return auth.response;
  try {
    await deleteCategory(params.id);
    await audit(auth.session.id, "delete", "category", params.id);
    return ok({ deleted: true });
  } catch (e: any) {
    return fail(e.message, 400);
  }
});
