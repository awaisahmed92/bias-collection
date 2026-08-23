import { z } from "zod";
import prisma from "@/lib/db";

export const shippingInputSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative().default(0),
  freeAbove: z.coerce.number().nonnegative().optional().nullable(),
  minDays: z.coerce.number().int().nonnegative().default(2),
  maxDays: z.coerce.number().int().nonnegative().default(5),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
export type ShippingInput = z.infer<typeof shippingInputSchema>;

export async function listShippingMethods(onlyActive = false) {
  return prisma.shippingMethod.findMany({
    where: onlyActive ? { isActive: true } : {},
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
  });
}

/** Methods available for a destination city (zone-specific first, then generic). */
export async function methodsForCity(city?: string) {
  const methods = await listShippingMethods(true);
  if (!city) return methods;
  const c = city.toLowerCase();
  const zoned = methods.filter((m) => m.zone && c.includes(m.zone.toLowerCase()));
  const generic = methods.filter((m) => !m.zone);
  return zoned.length ? [...zoned, ...generic] : generic.length ? generic : methods;
}

export function computeShippingCost(
  method: { price: number; freeAbove: number | null },
  subtotal: number,
  forceFree = false
) {
  if (forceFree) return 0;
  if (method.freeAbove != null && subtotal >= method.freeAbove) return 0;
  return Math.round(method.price);
}

export async function createShippingMethod(raw: unknown) {
  const input = shippingInputSchema.parse(raw);
  return prisma.shippingMethod.create({
    data: {
      name: input.name,
      description: input.description || null,
      zone: input.zone || null,
      price: input.price,
      freeAbove: input.freeAbove ?? null,
      minDays: input.minDays,
      maxDays: input.maxDays,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
    },
  });
}

export async function updateShippingMethod(id: string, raw: unknown) {
  const input = shippingInputSchema.parse(raw);
  return prisma.shippingMethod.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description || null,
      zone: input.zone || null,
      price: input.price,
      freeAbove: input.freeAbove ?? null,
      minDays: input.minDays,
      maxDays: input.maxDays,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
    },
  });
}

export async function deleteShippingMethod(id: string) {
  return prisma.shippingMethod.delete({ where: { id } });
}
