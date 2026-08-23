import prisma from "@/lib/db";
import type { Tx } from "./discount.service";

export type InventoryMovement = "STOCK_ADDED" | "STOCK_SOLD" | "STOCK_RETURNED" | "STOCK_DAMAGED" | "MANUAL_ADJUSTMENT";

type DbOrTx = typeof prisma | Tx;

/**
 * Apply a signed stock movement to a product (or variant) and write an InventoryLog.
 * Must run inside the caller's transaction when part of a bigger mutation.
 */
export async function adjustStock(
  db: DbOrTx,
  opts: {
    productId: string;
    variantId?: string | null;
    type: InventoryMovement;
    quantity: number; // signed
    reference?: string | null;
    note?: string | null;
    userId?: string | null;
  }
) {
  const { productId, variantId, type, quantity, reference, note, userId } = opts;
  if (!quantity) return null;

  let before = 0;
  let after = 0;

  if (variantId) {
    const v = await db.productVariant.findUnique({ where: { id: variantId } });
    if (!v) throw new Error("Variant not found for stock movement.");
    before = v.stock;
    after = v.stock + quantity;
    if (after < 0) throw new Error("Insufficient variant stock.");
    await db.productVariant.update({ where: { id: variantId }, data: { stock: after } });
  } else {
    const p = await db.product.findUnique({ where: { id: productId } });
    if (!p) throw new Error("Product not found for stock movement.");
    before = p.stock;
    after = p.stock + quantity;
    if (after < 0) throw new Error("Insufficient product stock.");
    await db.product.update({ where: { id: productId }, data: { stock: after } });
  }

  return db.inventoryLog.create({
    data: {
      productId,
      variantId: variantId ?? null,
      type,
      quantity,
      before,
      after,
      reference: reference ?? null,
      note: note ?? null,
      createdById: userId ?? null,
    },
  });
}

/** Available = total − reserved (per product or per variant). */
export function availableOf(row: { stock: number; reservedStock: number }) {
  return Math.max(0, row.stock - row.reservedStock);
}

export async function lowStockList() {
  const products = await prisma.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: { variants: { where: { isActive: true } }, images: { take: 1, orderBy: { sortOrder: "asc" } }, category: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const rows: {
    productId: string;
    name: string;
    sku: string;
    image: string | null;
    category: string;
    variantId?: string;
    variantName?: string;
    stock: number;
    threshold: number;
    level: "OUT" | "LOW";
  }[] = [];

  for (const p of products) {
    if (p.variants.length) {
      for (const v of p.variants) {
        const level = v.stock <= 0 ? "OUT" : v.stock <= p.lowStockThreshold ? "LOW" : null;
        if (level)
          rows.push({
            productId: p.id,
            name: p.name,
            sku: v.sku,
            image: v.image || p.images[0]?.url || null,
            category: p.category.name,
            variantId: v.id,
            variantName: [v.size, v.color].filter(Boolean).join(" / "),
            stock: v.stock,
            threshold: p.lowStockThreshold,
            level: level as "OUT" | "LOW",
          });
      }
    } else {
      const level = p.stock <= 0 ? "OUT" : p.stock <= p.lowStockThreshold ? "LOW" : null;
      if (level)
        rows.push({
          productId: p.id,
          name: p.name,
          sku: p.sku,
          image: p.images[0]?.url || null,
          category: p.category.name,
          stock: p.stock,
          threshold: p.lowStockThreshold,
          level: level as "OUT" | "LOW",
        });
    }
  }
  return rows.sort((a, b) => a.stock - b.stock);
}

export async function inventoryOverview(opts: { q?: string; page?: number; limit?: number }) {
  const { q, page = 1, limit = 20 } = opts;
  const where: any = { status: { not: "ARCHIVED" } };
  if (q) where.OR = [{ name: { contains: q } }, { sku: { contains: q } }];
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { variants: { orderBy: [{ size: "asc" }] }, images: { take: 1, orderBy: { sortOrder: "asc" } }, category: { select: { name: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function inventoryLogs(opts: { productId?: string; page?: number; limit?: number }) {
  const { productId, page = 1, limit = 30 } = opts;
  const where: any = {};
  if (productId) where.productId = productId;
  const [total, items] = await Promise.all([
    prisma.inventoryLog.count({ where }),
    prisma.inventoryLog.findMany({
      where,
      include: {
        product: { select: { name: true } },
        variant: { select: { size: true, color: true, sku: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
