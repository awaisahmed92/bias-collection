import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/services/coupon.service";

export const GET = handle(async () => {
  const auth = await requirePermission("coupons.manage");
  if ("response" in auth) return auth.response;
  return ok({ coupons: await listCoupons() });
});

export const POST = handle(async (req: Request) => {
  const auth = await requirePermission("coupons.manage");
  if ("response" in auth) return auth.response;
  const body = await req.json();
  try {
    if (body.id) {
      const coupon = await updateCoupon(String(body.id), body);
      await audit(auth.session.id, "update", "coupon", coupon.id, coupon.code);
      return ok({ coupon });
    }
    const coupon = await createCoupon(body);
    await audit(auth.session.id, "create", "coupon", coupon.id, coupon.code);
    return ok({ coupon });
  } catch (e: any) {
    if (e?.name === "ZodError") throw e;
    return fail(e.message, 400);
  }
});

export const DELETE = handle(async (req: Request) => {
  const auth = await requirePermission("coupons.manage");
  if ("response" in auth) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("id required");
  await deleteCoupon(id);
  await audit(auth.session.id, "delete", "coupon", id);
  return ok({ deleted: true });
});
