import { handle, ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getCartSummary } from "@/services/cart.service";
import { validateCoupon, CouponError } from "@/services/coupon.service";
import prisma from "@/lib/db";

export const POST = handle(async (req: Request) => {
  const { code } = await req.json();
  if (!code) return fail("Coupon code required.");
  const session = await getSession();
  const summary = await getCartSummary(session?.id ?? null);
  const productRows = await prisma.product.findMany({
    where: { id: { in: summary.items.map((i) => i.productId) } },
    select: { id: true, categoryId: true },
  });
  const catMap = new Map(productRows.map((p) => [p.id, p.categoryId]));
  try {
    const result = await validateCoupon({
      code,
      subtotal: summary.subtotal,
      userId: session?.id ?? null,
      items: summary.items.map((l) => ({
        productId: l.productId,
        categoryId: catMap.get(l.productId) || "",
        lineTotal: l.lineTotal,
      })),
    });
    return ok({ result });
  } catch (e) {
    if (e instanceof CouponError) return fail(e.message, 400);
    throw e;
  }
});
