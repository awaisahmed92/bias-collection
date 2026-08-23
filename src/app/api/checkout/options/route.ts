import { handle, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getCartSummary } from "@/services/cart.service";
import { methodsForCity, computeShippingCost } from "@/services/shipping.service";
import { getEnabledPaymentMethods } from "@/services/payment.service";
import { validateCoupon, CouponError } from "@/services/coupon.service";
import { getSettingNumber } from "@/services/settings.service";
import prisma from "@/lib/db";

/** Live checkout quote: shipping methods w/ costs, coupon outcome, totals, enabled payments. */
export const GET = handle(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const city = sp.get("city") || undefined;
  const couponCode = sp.get("coupon") || undefined;
  const session = await getSession();

  const summary = await getCartSummary(session?.id ?? null);
  const methods = await methodsForCity(city);
  const paymentMethods = await getEnabledPaymentMethods();
  const taxRate = await getSettingNumber("taxRatePercent", 0);

  let coupon: any = null;
  let couponError: string | null = null;
  if (couponCode) {
    try {
      const productRows = await prisma.product.findMany({
        where: { id: { in: summary.items.map((i) => i.productId) } },
        select: { id: true, categoryId: true },
      });
      const catMap = new Map(productRows.map((p) => [p.id, p.categoryId]));
      coupon = await validateCoupon({
        code: couponCode,
        subtotal: summary.subtotal,
        userId: session?.id ?? null,
        items: summary.items.map((l) => ({ productId: l.productId, categoryId: catMap.get(l.productId) || "", lineTotal: l.lineTotal })),
      });
    } catch (e) {
      if (e instanceof CouponError) couponError = e.message;
      else throw e;
    }
  }

  const afterCoupon = Math.max(0, summary.subtotal - (coupon?.discount ?? 0));
  const promoFreeship = summary.freeShippingThreshold != null && afterCoupon >= summary.freeShippingThreshold;
  const forceFree = coupon?.freeShipping || promoFreeship;

  return ok({
    quote: {
      itemCount: summary.itemCount,
      originalSubtotal: summary.originalSubtotal,
      savings: summary.savings,
      subtotal: summary.subtotal,
      coupon: coupon ? { code: coupon.code, discount: coupon.discount, freeShipping: coupon.freeShipping, message: coupon.message } : null,
      couponError,
      promoFreeShipping: promoFreeship,
      freeShipping: !!forceFree,
      methods: methods.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        minDays: m.minDays,
        maxDays: m.maxDays,
        listPrice: m.price,
        cost: computeShippingCost(m, afterCoupon, !!forceFree),
      })),
      payments: paymentMethods.map((p) => ({
        key: p.key,
        name: p.name,
        description: p.description,
        instructions: p.instructions,
      })),
      taxRate,
      afterCoupon,
    },
  });
});
