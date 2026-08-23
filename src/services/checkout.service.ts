import { z } from "zod";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCartSummary, clearCart, resolveCart } from "./cart.service";
import { validateCoupon, recordCouponUsage } from "./coupon.service";
import { computeShippingCost } from "./shipping.service";
import { initiatePayment } from "./payment.service";
import { adjustStock, lowStockList } from "./inventory.service";
import { generateOrderNumber, getOrderByNumber } from "./order.service";
import { notifyOrderPlaced, notifyLowStock } from "./notification.service";
import { getSettingNumber } from "./settings.service";

export const checkoutSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Valid phone required"),
  country: z.string().default("Pakistan"),
  city: z.string().min(2, "City required"),
  area: z.string().min(2, "Area required"),
  address: z.string().min(5, "Street address required"),
  postalCode: z.string().optional().nullable(),
  shippingMethodId: z.string().min(1, "Select a shipping method"),
  paymentMethod: z.string().min(1, "Select a payment method"),
  couponCode: z.string().optional().nullable(),
  customerNote: z.string().optional().nullable(),
  saveAddress: z.boolean().default(false),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export class CheckoutError extends Error {}

/**
 * CheckoutService — single orchestrated order placement:
 * price re-validation via DiscountService, stock reservation, payment initiation,
 * coupon usage, inventory logs, notifications — all in one transaction.
 */
export async function placeOrder(raw: unknown) {
  const input = checkoutSchema.parse(raw);
  const session = await getSession();
  const userId = session?.id ?? null;

  const summary = await getCartSummary(userId);
  if (!summary.items.length) throw new CheckoutError("Your cart is empty.");

  // stock re-validation with friendly errors
  const unavailable = summary.items.filter((l) => !l.inStock || l.status !== "ACTIVE");
  if (unavailable.length)
    throw new CheckoutError(
      `Some items are no longer available in the requested quantity: ${unavailable.map((u) => u.name).join(", ")}`
    );

  // coupon
  let couponDiscount = 0;
  let couponFreeShipping = false;
  let appliedCode: string | null = null;
  if (input.couponCode) {
    // need category ids for scoped coupons
    const productRows = await prisma.product.findMany({
      where: { id: { in: summary.items.map((i) => i.productId) } },
      select: { id: true, categoryId: true },
    });
    const catMap = new Map(productRows.map((p) => [p.id, p.categoryId]));
    const result = await validateCoupon({
      code: input.couponCode,
      subtotal: summary.subtotal,
      userId,
      items: summary.items.map((l) => ({ productId: l.productId, categoryId: catMap.get(l.productId) || "", lineTotal: l.lineTotal })),
    });
    couponDiscount = result.discount;
    couponFreeShipping = result.freeShipping;
    appliedCode = result.code;
  }

  // shipping
  const method = await prisma.shippingMethod.findUnique({ where: { id: input.shippingMethodId } });
  if (!method || !method.isActive) throw new CheckoutError("Selected shipping method is unavailable.");
  const afterCoupon = Math.max(0, summary.subtotal - couponDiscount);
  const promoFreeship = summary.freeShippingThreshold != null && afterCoupon >= summary.freeShippingThreshold;
  const shippingCost = computeShippingCost(method, afterCoupon, couponFreeShipping || promoFreeship);

  // tax
  const taxRate = await getSettingNumber("taxRatePercent", 0);
  const taxTotal = Math.round((afterCoupon * taxRate) / 100);

  const total = Math.max(0, afterCoupon + shippingCost + taxTotal);
  const orderNumber = await generateOrderNumber();

  const cart = await resolveCart(userId);

  let orderId = "";
  await prisma.$transaction(async (tx) => {
    // 1. decrement stock + inventory logs
    for (const line of summary.items) {
      await adjustStock(tx, {
        productId: line.productId,
        variantId: line.variantId,
        type: "STOCK_SOLD",
        quantity: -line.quantity,
        reference: orderNumber,
        note: "Order placed",
        userId,
      });
      await tx.product.update({ where: { id: line.productId }, data: { soldCount: { increment: line.quantity } } });
    }

    // 2. create order with snapshots
    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        customerFirstName: input.firstName,
        customerLastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        shippingCountry: input.country,
        shippingCity: input.city,
        shippingArea: input.area,
        shippingAddress: input.address,
        shippingPostalCode: input.postalCode || null,
        subtotal: summary.originalSubtotal,
        productSavings: summary.savings,
        couponCode: appliedCode,
        couponDiscount,
        shippingCost,
        taxTotal,
        total,
        shippingMethodId: method.id,
        shippingMethodName: method.name,
        paymentMethod: input.paymentMethod,
        status: "PENDING",
        paymentStatus: "PENDING",
        customerNote: input.customerNote || null,
        items: {
          create: summary.items.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            productName: l.name,
            variantName: l.variantName,
            sku: l.sku,
            image: l.image,
            quantity: l.quantity,
            originalPrice: l.unitBase,
            finalPrice: l.unitFinal,
            lineTotal: l.lineTotal,
          })),
        },
        history: { create: { status: "PENDING", note: "Order placed", changedById: userId } },
      },
    });
    orderId = order.id;

    // 3. initiate payment through the provider abstraction
    const payment = await initiatePayment(input.paymentMethod, { orderNumber, amount: total });
    await tx.payment.create({
      data: {
        orderId: order.id,
        method: input.paymentMethod,
        amount: total,
        status: payment.status,
        transactionId: payment.transactionId ?? null,
        providerResponse: payment.providerResponse ?? null,
      },
    });
    if (payment.status === "SUCCESS") {
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", status: "CONFIRMED" } });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: "CONFIRMED", note: `Payment captured via ${input.paymentMethod}` },
      });
    }
    if (payment.status === "FAILED") {
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
    }

    // 4. coupon usage
    if (appliedCode) await recordCouponUsage(appliedCode, userId, order.id, tx);

    // 5. save address for returning customer
    if (userId && input.saveAddress) {
      await tx.address.create({
        data: {
          userId,
          label: "Checkout",
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          country: input.country,
          city: input.city,
          area: input.area,
          address: input.address,
          postalCode: input.postalCode || null,
          isDefault: false,
        },
      });
    }

    // 6. empty cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
  });

  // post-commit side effects
  await notifyOrderPlaced({ id: orderId, orderNumber, total, userId, email: input.email.toLowerCase() });
  const low = await lowStockList();
  const criticallyLow = low.filter((l) => l.level === "OUT" || l.stock <= 2).slice(0, 5);
  if (criticallyLow.length) await notifyLowStock(criticallyLow.map((l) => ({ name: l.name, stock: l.stock })));

  return getOrderByNumber(orderNumber);
}
