import { z } from "zod";
import prisma from "@/lib/db";

export const promotionInputSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  type: z.enum(["STORE_WIDE", "CATEGORY", "PRODUCT", "FLASH", "BUY_X_GET_Y", "FREE_SHIPPING"]),
  discountType: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]).default("PERCENTAGE"),
  discountValue: z.coerce.number().nonnegative().default(0),
  configJson: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  priority: z.coerce.number().int().default(0),
  productIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
});
export type PromotionInput = z.infer<typeof promotionInputSchema>;

export function isPromotionLive(p: { isActive: boolean; startDate: Date | null; endDate: Date | null }) {
  const now = new Date();
  return p.isActive && (!p.startDate || p.startDate <= now) && (!p.endDate || p.endDate >= now);
}

export async function listPromotions() {
  const rows = await prisma.promotion.findMany({
    include: {
      products: { include: { product: { select: { id: true, name: true } } } },
      categories: { include: { category: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((p) => ({ ...p, live: isPromotionLive(p) }));
}

function dates(input: PromotionInput) {
  return {
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: input.endDate ? new Date(input.endDate) : null,
  };
}

export async function createPromotion(raw: unknown) {
  const input = promotionInputSchema.parse(raw);
  return prisma.promotion.create({
    data: {
      name: input.name,
      description: input.description || null,
      type: input.type,
      discountType: input.type === "FREE_SHIPPING" ? "FREE_SHIPPING" : input.discountType,
      discountValue: input.discountValue,
      configJson: input.configJson || "{}",
      ...dates(input),
      isActive: input.isActive,
      priority: input.priority,
      products: { create: input.productIds.map((productId) => ({ productId })) },
      categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
    },
  });
}

export async function updatePromotion(id: string, raw: unknown) {
  const input = promotionInputSchema.parse(raw);
  await prisma.promotionProduct.deleteMany({ where: { promotionId: id } });
  await prisma.promotionCategory.deleteMany({ where: { promotionId: id } });
  return prisma.promotion.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description || null,
      type: input.type,
      discountType: input.type === "FREE_SHIPPING" ? "FREE_SHIPPING" : input.discountType,
      discountValue: input.discountValue,
      configJson: input.configJson || "{}",
      ...dates(input),
      isActive: input.isActive,
      priority: input.priority,
      products: { create: input.productIds.map((productId) => ({ productId })) },
      categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
    },
  });
}

export async function deletePromotion(id: string) {
  return prisma.promotion.delete({ where: { id } });
}
