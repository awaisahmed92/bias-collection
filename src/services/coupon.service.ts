import { z } from "zod";
import prisma from "@/lib/db";

export const couponInputSchema = z.object({
  code: z.string().min(3).transform((s) => s.toUpperCase().trim()),
  description: z.string().optional().nullable(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  amount: z.coerce.number().nonnegative().default(0),
  minOrderAmount: z.coerce.number().nonnegative().optional().nullable(),
  maxDiscount: z.coerce.number().nonnegative().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  usageLimit: z.coerce.number().int().positive().optional().nullable(),
  usagePerCustomer: z.coerce.number().int().positive().optional().nullable(),
  appliesTo: z.enum(["ALL", "PRODUCTS", "CATEGORIES"]).default("ALL"),
  productIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});
export type CouponInput = z.infer<typeof couponInputSchema>;

export class CouponError extends Error {}

export type CouponValidation = {
  code: string;
  type: string;
  discount: number;
  freeShipping: boolean;
  message: string;
};

/** Validate a coupon against a subtotal (+ items for scoped coupons) and compute its discount. */
export async function validateCoupon(opts: {
  code: string;
  subtotal: number;
  userId?: string | null;
  items?: { productId: string; categoryId: string; lineTotal: number }[];
}): Promise<CouponValidation> {
  const { code, subtotal, userId, items } = opts;
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
  if (!coupon || !coupon.isActive) throw new CouponError("Invalid or inactive coupon code.");

  const now = new Date();
  if (coupon.startDate && coupon.startDate > now) throw new CouponError("This coupon is not active yet.");
  if (coupon.endDate && coupon.endDate < now) throw new CouponError("This coupon has expired.");
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    throw new CouponError("This coupon has reached its usage limit.");
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount)
    throw new CouponError(`Minimum order of Rs. ${coupon.minOrderAmount.toLocaleString()} required for this coupon.`);

  if (coupon.usagePerCustomer && userId) {
    const usedByCustomer = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (usedByCustomer >= coupon.usagePerCustomer)
      throw new CouponError("You have already used this coupon the maximum number of times.");
  }

  // scoped coupons
  let eligibleSubtotal = subtotal;
  if (coupon.appliesTo === "PRODUCTS" && items) {
    const ids = (coupon.productIds || "").split(",").filter(Boolean);
    eligibleSubtotal = items.filter((i) => ids.includes(i.productId)).reduce((s, i) => s + i.lineTotal, 0);
    if (eligibleSubtotal <= 0) throw new CouponError("This coupon does not apply to items in your cart.");
  } else if (coupon.appliesTo === "CATEGORIES" && items) {
    const ids = (coupon.categoryIds || "").split(",").filter(Boolean);
    eligibleSubtotal = items.filter((i) => ids.includes(i.categoryId)).reduce((s, i) => s + i.lineTotal, 0);
    if (eligibleSubtotal <= 0) throw new CouponError("This coupon does not apply to items in your cart.");
  }

  let discount = 0;
  let freeShipping = false;
  let message = "";

  if (coupon.type === "FREE_SHIPPING") {
    freeShipping = true;
    message = "Free shipping applied!";
  } else if (coupon.type === "PERCENTAGE") {
    discount = Math.round((eligibleSubtotal * coupon.amount) / 100);
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    message = `${coupon.amount}% off applied${coupon.maxDiscount ? ` (max Rs. ${coupon.maxDiscount.toLocaleString()})` : ""}!`;
  } else {
    discount = Math.min(Math.round(coupon.amount), eligibleSubtotal);
    message = `Rs. ${discount.toLocaleString()} off applied!`;
  }

  discount = Math.min(discount, subtotal);
  return { code: coupon.code, type: coupon.type, discount, freeShipping, message };
}

export async function recordCouponUsage(code: string, userId: string | null, orderId: string, tx?: any) {
  const db = tx ?? prisma;
  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon) return;
  await db.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
  await db.couponUsage.create({ data: { couponId: coupon.id, userId: userId ?? null, orderId } });
}

// ── Admin CRUD ──

export async function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

function toDates(input: CouponInput) {
  return {
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: input.endDate ? new Date(input.endDate) : null,
  };
}

export async function createCoupon(raw: unknown) {
  const input = couponInputSchema.parse(raw);
  const exists = await prisma.coupon.findUnique({ where: { code: input.code } });
  if (exists) throw new Error(`Coupon "${input.code}" already exists.`);
  return prisma.coupon.create({
    data: {
      code: input.code,
      description: input.description || null,
      type: input.type,
      amount: input.amount,
      minOrderAmount: input.minOrderAmount ?? null,
      maxDiscount: input.maxDiscount ?? null,
      ...toDates(input),
      usageLimit: input.usageLimit ?? null,
      usagePerCustomer: input.usagePerCustomer ?? null,
      appliesTo: input.appliesTo,
      productIds: input.productIds.join(","),
      categoryIds: input.categoryIds.join(","),
      isActive: input.isActive,
    },
  });
}

export async function updateCoupon(id: string, raw: unknown) {
  const input = couponInputSchema.parse(raw);
  return prisma.coupon.update({
    where: { id },
    data: {
      code: input.code,
      description: input.description || null,
      type: input.type,
      amount: input.amount,
      minOrderAmount: input.minOrderAmount ?? null,
      maxDiscount: input.maxDiscount ?? null,
      ...toDates(input),
      usageLimit: input.usageLimit ?? null,
      usagePerCustomer: input.usagePerCustomer ?? null,
      appliesTo: input.appliesTo,
      productIds: input.productIds.join(","),
      categoryIds: input.categoryIds.join(","),
      isActive: input.isActive,
    },
  });
}

export async function deleteCoupon(id: string) {
  return prisma.coupon.delete({ where: { id } });
}
