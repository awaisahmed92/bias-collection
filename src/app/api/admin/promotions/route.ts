import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import { listPromotions, createPromotion, updatePromotion, deletePromotion } from "@/services/promotion.service";

export const GET = handle(async () => {
  const auth = await requirePermission("promotions.manage");
  if ("response" in auth) return auth.response;
  return ok({ promotions: await listPromotions() });
});

export const POST = handle(async (req: Request) => {
  const auth = await requirePermission("promotions.manage");
  if ("response" in auth) return auth.response;
  const body = await req.json();
  try {
    if (body.id) {
      const promotion = await updatePromotion(String(body.id), body);
      await audit(auth.session.id, "update", "promotion", promotion.id, promotion.name);
      return ok({ promotion });
    }
    const promotion = await createPromotion(body);
    await audit(auth.session.id, "create", "promotion", promotion.id, promotion.name);
    return ok({ promotion });
  } catch (e: any) {
    if (e?.name === "ZodError") throw e;
    return fail(e.message, 400);
  }
});

export const DELETE = handle(async (req: Request) => {
  const auth = await requirePermission("promotions.manage");
  if ("response" in auth) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("id required");
  await deletePromotion(id);
  await audit(auth.session.id, "delete", "promotion", id);
  return ok({ deleted: true });
});
