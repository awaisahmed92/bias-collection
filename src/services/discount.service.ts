import prisma from "@/lib/db";
import type { Prisma, Product, ProductVariant, Promotion } from "@prisma/client";

/**
 * DiscountService — the single source of truth for pricing.
 * Every surface (PLP, PDP, cart, checkout, admin preview) resolves prices here.
 *
 * Resolution priority (no double-dipping by design):
 *   1. Product-targeted promotion  (PRODUCT / FLASH)
 *   2. Product's own salePrice
 *   3. Category promotion
 *   4. Store-wide promotion
 * Coupons apply afterwards at order level.
 */

export type ActivePromotion = Promotion & {
  products: { productId: string }[];
  categories: { categoryId: string }[];
};

export async function getActivePromotions(): Promise<ActivePromotion[]> {
  const now = new Date();
  return prisma.promotion.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    include: { products: { select: { productId: true } }, categories: { select: { categoryId: true } } },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

export type PriceResult = {
  base: number; // catalog price (variant price or product originalPrice)
  final: number; // unit price after item-level discounts
  source: "NONE" | "SALE_PRICE" | "PRODUCT_PROMO" | "CATEGORY_PROMO" | "STORE_PROMO" | "FLASH";
  label: string | null;
  promotionId?: string;
  discountPercent: number;
};

type PriceableProduct = Pick<Product, "originalPrice" | "salePrice" | "categoryId"> & { id: string };

export function priceForProduct(
  product: PriceableProduct,
  promos: ActivePromotion[],
  variant?: Pick<ProductVariant, "price" | "salePrice"> | null
): PriceResult {
  const base = Math.round(variant?.price ?? product.originalPrice);
  const variantSale = variant?.salePrice ?? null;

  const apply = (p: ActivePromotion): number => {
    if (p.discountType === "PERCENTAGE") return Math.max(0, Math.round(base * (1 - p.discountValue / 100)));
    if (p.discountType === "FIXED") return Math.max(0, Math.round(base - p.discountValue));
    return base;
  };

  const productPromo = promos.find(
    (p) => (p.type === "PRODUCT" || p.type === "FLASH") && p.products.some((x) => x.productId === product.id)
  );
  if (productPromo) {
    const final = apply(productPromo);
    if (final < base)
      return toResult(base, final, productPromo.type === "FLASH" ? "FLASH" : "PRODUCT_PROMO", productPromo.name, productPromo.id);
  }

  const productPromoId = productPromo?.id;
  const sale = variantSale ?? product.salePrice;
  if (sale != null && sale < base) return toResult(base, Math.round(sale), "SALE_PRICE", "Sale");

  const categoryPromo = promos.find(
    (p) => p.type === "CATEGORY" && p.categories.some((x) => x.categoryId === product.categoryId)
  );
  if (categoryPromo) {
    const final = apply(categoryPromo);
    if (final < base) return toResult(base, final, "CATEGORY_PROMO", categoryPromo.name, categoryPromo.id);
  }

  const storePromo = promos.find((p) => p.type === "STORE_WIDE");
  if (storePromo) {
    const final = apply(storePromo);
    if (final < base) return toResult(base, final, "STORE_PROMO", storePromo.name, storePromo.id);
  }

  void productPromoId;
  return toResult(base, base, "NONE", null);
}

function toResult(
  base: number,
  final: number,
  source: PriceResult["source"],
  label: string | null,
  promotionId?: string
): PriceResult {
  return {
    base,
    final,
    source,
    label: source === "NONE" ? null : label,
    promotionId: source === "NONE" ? undefined : promotionId,
    discountPercent: base > 0 ? Math.round(((base - final) / base) * 100) : 0,
  };
}

/** Buy X Get Y: returns number of free units for a cart line. */
export function freeUnitsForLine(
  productId: string,
  quantity: number,
  promos: ActivePromotion[]
): { freeUnits: number; promo?: ActivePromotion } {
  const promo = promos.find(
    (p) => p.type === "BUY_X_GET_Y" && p.products.some((x) => x.productId === productId)
  );
  if (!promo) return { freeUnits: 0 };
  let buy = 0,
    get = 0;
  try {
    const cfg = JSON.parse(promo.configJson || "{}");
    buy = Number(cfg.buy) || 0;
    get = Number(cfg.get) || 0;
  } catch {}
  if (buy <= 0 || get <= 0) return { freeUnits: 0, promo };
  const freeUnits = Math.floor(quantity / (buy + get)) * get;
  return { freeUnits, promo };
}

/** Store-wide FREE_SHIPPING promotion threshold (Rs.) if one is active. */
export function freeShippingThreshold(promos: ActivePromotion[]): number | null {
  const promo = promos.find((p) => p.type === "FREE_SHIPPING");
  if (!promo) return null;
  return promo.discountValue > 0 ? promo.discountValue : 0;
}

/** Where needed outside the service layer. */
export type Tx = Prisma.TransactionClient;
