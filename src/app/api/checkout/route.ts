import { handle, ok, fail, rateLimit, clientIp } from "@/lib/api";
import { placeOrder, CheckoutError } from "@/services/checkout.service";
import { CouponError } from "@/services/coupon.service";
import { generateOrderToken } from "@/lib/order-token";

export const POST = handle(async (req: Request) => {
  if (!rateLimit(`checkout:${clientIp(req)}`, 8, 60_000)) return fail("Too many attempts. Please wait a moment.", 429);
  const body = await req.json();
  try {
    const order = await placeOrder(body);
    const confirmationToken = order ? generateOrderToken(order.id) : null;
    return ok({ order, confirmationToken });
  } catch (e) {
    if (e instanceof CheckoutError || e instanceof CouponError) return fail(e.message, 400);
    throw e;
  }
});
