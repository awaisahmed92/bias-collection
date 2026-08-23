import { z } from "zod";
import prisma from "@/lib/db";
import { slugify } from "@/lib/utils";
import { getActivePromotions, priceForProduct, type ActivePromotion } from "./discount.service";

// ─────────────────────────── Validation ───────────────────────────

export const variantSchema = z.object({
  id: z.string().optional(),
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  sku: z.string().min(1, "Variant SKU required"),
  price: z.coerce.number().nonnegative().optional().nullable(),
  salePrice: z.coerce.number().nonnegative().optional().nullable(),
  stock: z.coerce.number().int().nonnegative().default(0),
  weight: z.coerce.number().nonnegative().optional().nullable(),
  image: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const productInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sku: z.string().min(1),
  barcode: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  categoryId: z.string().min(1, "Category required"),
  tags: z.string().optional().nullable(),
  originalPrice: z.coerce.number().positive("Price must be > 0"),
  salePrice: z.coerce.number().nonnegative().optional().nullable(),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
  stock: z.coerce.number().int().nonnegative().default(0),
  lowStockThreshold: z.coerce.number().int().nonnegative().default(5),
  weight: z.coerce.number().nonnegative().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  allowBackorder: z.boolean().default(false),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  images: z.array(z.object({ url: z.string().min(1), alt: z.string().optional(), sortOrder: z.number().default(0) })).default([]),
  variants: z.array(variantSchema).default([]),
});
export type ProductInput = z.infer<typeof productInputSchema>;

// ─────────────────────────── Queries ───────────────────────────

export type ProductFilters = {
  q?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  inStock?: boolean;
  onSale?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  bestSelling?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "best" | "popular";
  page?: number;
  limit?: number;
  includeInactive?: boolean;
};

const cardInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, take: 2 },
  variants: { where: { isActive: true } },
  category: { select: { id: true, name: true, slug: true, parent: { select: { slug: true, name: true } } } },
};

export function decorateProduct(p: any, promos: ActivePromotion[]) {
  const price = priceForProduct(p, promos, null);
  // available stock across variants (or product stock when variant-free)
  const hasVariants = (p.variants?.length ?? 0) > 0;
  const available = hasVariants
    ? p.variants.reduce((s: number, v: any) => s + Math.max(0, v.stock - v.reservedStock), 0)
    : Math.max(0, p.stock - p.reservedStock);
  const rating = p._rating ?? null;
  return {
    ...p,
    price,
    hasVariants,
    available,
    inStock: p.allowBackorder || available > 0,
    sizes: [...new Set((p.variants ?? []).map((v: any) => v.size).filter(Boolean))] as string[],
    colors: [...new Set((p.variants ?? []).map((v: any) => v.color).filter(Boolean))] as string[],
  };
}

export async function listProducts(filters: ProductFilters) {
  const {
    q,
    categorySlug,
    minPrice,
    maxPrice,
    size,
    color,
    inStock,
    onSale,
    isNew,
    isFeatured,
    bestSelling,
    sort = "newest",
    page = 1,
    limit = 12,
    includeInactive = false,
  } = filters;

  const where: any = {};
  if (!includeInactive) where.status = "ACTIVE";

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { sku: { contains: q } },
      { tags: { contains: q } },
      { description: { contains: q } },
      { shortDescription: { contains: q } },
      { brand: { contains: q } },
    ];
  }

  if (categorySlug) {
    where.category = { OR: [{ slug: categorySlug }, { parent: { slug: categorySlug } }] };
  }

  if (minPrice != null || maxPrice != null) {
    where.originalPrice = {};
    if (minPrice != null) where.originalPrice.gte = minPrice;
    if (maxPrice != null) where.originalPrice.lte = maxPrice;
  }

  if (size) where.variants = { ...(where.variants || {}), some: { size, isActive: true } };
  if (color) where.variants = { ...(where.variants || {}), some: { color, isActive: true } };
  if (isNew) where.isNewArrival = true;
  if (isFeatured) where.isFeatured = true;
  if (inStock) {
    where.AND = [
      ...(where.AND || []),
      { OR: [{ stock: { gt: 0 } }, { variants: { some: { stock: { gt: 0 }, isActive: true } } }, { allowBackorder: true }] },
    ];
  }
  if (bestSelling) where.OR = [...(where.OR || [])];

  const promos = await getActivePromotions();

  if (onSale) {
    const promoProductIds = new Set<string>();
    const promoCategoryIds = new Set<string>();
    for (const p of promos) {
      if ((p.type === "PRODUCT" || p.type === "FLASH") && (p.discountType === "PERCENTAGE" || p.discountType === "FIXED"))
        p.products.forEach((x) => promoProductIds.add(x.productId));
      if (p.type === "CATEGORY") p.categories.forEach((x) => promoCategoryIds.add(x.categoryId));
    }
    const storeWide = promos.some((p) => p.type === "STORE_WIDE");
    if (!storeWide) {
      where.AND = [
        ...(where.AND || []),
        { OR: [{ salePrice: { not: null } }, { id: { in: [...promoProductIds] } }, { categoryId: { in: [...promoCategoryIds] } }] },
      ];
    }
  }

  const orderBy: any =
    sort === "price_asc"
      ? { originalPrice: "asc" }
      : sort === "price_desc"
        ? { originalPrice: "desc" }
        : sort === "best"
          ? { soldCount: "desc" }
          : sort === "popular"
            ? { viewCount: "desc" }
            : { createdAt: "desc" };

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: cardInclude,
      orderBy: bestSelling ? { soldCount: "desc" } : orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const items = rows.map((p) => decorateProduct(p, promos));
  // when sorting by effective discounted price, refine within page
  if (sort === "price_asc") items.sort((a, b) => a.price.final - b.price.final);
  if (sort === "price_desc") items.sort((a, b) => b.price.final - a.price.final);

  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: [{ size: "asc" }, { color: "asc" }] },
      category: { include: { parent: true } },
      reviews: {
        where: { status: "APPROVED" },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!product) return null;
  // fire & forget view counter
  prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  const promos = await getActivePromotions();
  const decorated = decorateProduct(product, promos);
  const rating =
    product.reviews.length > 0
      ? Math.round((product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length) * 10) / 10
      : null;
  return { ...decorated, rating, reviewCount: product.reviews.length };
}

export async function getRelatedProducts(productId: string, categoryId: string, take = 4) {
  const promos = await getActivePromotions();
  const rows = await prisma.product.findMany({
    where: { status: "ACTIVE", categoryId, id: { not: productId } },
    include: cardInclude,
    take,
    orderBy: { soldCount: "desc" },
  });
  return rows.map((p) => decorateProduct(p, promos));
}

export async function getFilterMeta() {
  const [categories, sizeRows, colorRows, agg] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, include: { children: true }, }),
    prisma.productVariant.findMany({ where: { isActive: true, size: { not: null } }, select: { size: true }, distinct: ["size"] }),
    prisma.productVariant.findMany({ where: { isActive: true, color: { not: null } }, select: { color: true }, distinct: ["color"] }),
    prisma.product.aggregate({ _min: { originalPrice: true }, _max: { originalPrice: true } }),
  ]);
  return {
    categories: categories.filter((c) => !c.parentId),
    sizes: sizeRows.map((r) => r.size!).filter(Boolean),
    colors: colorRows.map((r) => r.color!).filter(Boolean),
    priceMin: Math.floor(agg._min.originalPrice ?? 0),
    priceMax: Math.ceil(agg._max.originalPrice ?? 0),
  };
}

export async function autocomplete(q: string) {
  if (!q || q.length < 2) return [];
  const promos = await getActivePromotions();
  const rows = await prisma.product.findMany({
    where: { status: "ACTIVE", OR: [{ name: { contains: q } }, { tags: { contains: q } }, { sku: { contains: q } }] },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { where: { isActive: true } } },
    take: 6,
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.images[0]?.url ?? null,
    price: priceForProduct(p, promos, null),
  }));
}

// ─────────────────────────── Admin mutations ───────────────────────────

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let slug = slugify(base) || `product-${Date.now()}`;
  let i = 1;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${slugify(base)}-${++i}`;
  }
}

export async function createProduct(raw: unknown, userId?: string) {
  const input = productInputSchema.parse(raw);
  const slug = await uniqueSlug(input.slug || input.name);

  const skuClash = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (skuClash) throw new Error(`SKU "${input.sku}" already exists.`);

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      shortDescription: input.shortDescription || null,
      description: input.description || null,
      sku: input.sku,
      barcode: input.barcode || null,
      brand: input.brand || "Bias Collection",
      categoryId: input.categoryId,
      tags: input.tags || "",
      originalPrice: input.originalPrice,
      salePrice: input.salePrice ?? null,
      costPrice: input.costPrice ?? null,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold,
      weight: input.weight ?? null,
      status: input.status,
      isFeatured: input.isFeatured,
      isNewArrival: input.isNewArrival,
      isBestSeller: input.isBestSeller,
      allowBackorder: input.allowBackorder,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      images: { create: input.images.map((img, i) => ({ url: img.url, alt: img.alt || input.name, sortOrder: img.sortOrder ?? i })) },
      variants: {
        create: input.variants.map((v) => ({
          size: v.size || null,
          color: v.color || null,
          sku: v.sku,
          price: v.price ?? null,
          salePrice: v.salePrice ?? null,
          stock: v.stock,
          weight: v.weight ?? null,
          image: v.image || null,
          isActive: v.isActive,
        })),
      },
    },
    include: { images: true, variants: true },
  });

  // opening stock log
  const opening = input.variants.length
    ? input.variants.map((v, i) => ({ productId: product.id, variantId: product.variants[i]?.id, qty: v.stock }))
    : [{ productId: product.id, variantId: undefined as string | undefined, qty: input.stock }];
  for (const o of opening) {
    if (o.qty > 0)
      await prisma.inventoryLog.create({
        data: {
          productId: o.productId,
          variantId: o.variantId ?? null,
          type: "STOCK_ADDED",
          quantity: o.qty,
          before: 0,
          after: o.qty,
          note: "Opening stock",
          createdById: userId,
        },
      });
  }
  return product;
}

export async function updateProduct(id: string, raw: unknown, userId?: string) {
  const input = productInputSchema.parse(raw);
  const existing = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!existing) throw new Error("Product not found.");
  const slug = await uniqueSlug(input.slug || input.name, id);

  const skuClash = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (skuClash && skuClash.id !== id) throw new Error(`SKU "${input.sku}" already exists.`);

  // stock delta → inventory log
  if (!input.variants.length && input.stock !== existing.stock) {
    const delta = input.stock - existing.stock;
    await prisma.inventoryLog.create({
      data: {
        productId: id,
        type: "MANUAL_ADJUSTMENT",
        quantity: delta,
        before: existing.stock,
        after: input.stock,
        note: "Edited via admin product form",
        createdById: userId,
      },
    });
  }

  // upsert variants
  const keepVariantIds: string[] = [];
  for (const v of input.variants) {
    if (v.id && existing.variants.some((ev) => ev.id === v.id)) {
      const ev = existing.variants.find((x) => x.id === v.id)!;
      if (ev.stock !== v.stock) {
        const delta = v.stock - ev.stock;
        await prisma.inventoryLog.create({
          data: {
            productId: id,
            variantId: v.id,
            type: "MANUAL_ADJUSTMENT",
            quantity: delta,
            before: ev.stock,
            after: v.stock,
            note: "Edited via admin product form",
            createdById: userId,
          },
        });
      }
      await prisma.productVariant.update({
        where: { id: v.id },
        data: {
          size: v.size || null,
          color: v.color || null,
          sku: v.sku,
          price: v.price ?? null,
          salePrice: v.salePrice ?? null,
          stock: v.stock,
          weight: v.weight ?? null,
          image: v.image || null,
          isActive: v.isActive,
        },
      });
      keepVariantIds.push(v.id);
    } else {
      const created = await prisma.productVariant.create({
        data: {
          productId: id,
          size: v.size || null,
          color: v.color || null,
          sku: v.sku,
          price: v.price ?? null,
          salePrice: v.salePrice ?? null,
          stock: v.stock,
          weight: v.weight ?? null,
          image: v.image || null,
          isActive: v.isActive,
        },
      });
      if (v.stock > 0)
        await prisma.inventoryLog.create({
          data: {
            productId: id,
            variantId: created.id,
            type: "STOCK_ADDED",
            quantity: v.stock,
            before: 0,
            after: v.stock,
            note: "Variant added",
            createdById: userId,
          },
        });
      keepVariantIds.push(created.id);
    }
  }
  const toDelete = existing.variants.filter((v) => !keepVariantIds.includes(v.id)).map((v) => v.id);
  if (toDelete.length) await prisma.productVariant.deleteMany({ where: { id: { in: toDelete } } });

  await prisma.productImage.deleteMany({ where: { productId: id } });

  return prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      slug,
      shortDescription: input.shortDescription || null,
      description: input.description || null,
      sku: input.sku,
      barcode: input.barcode || null,
      brand: input.brand || "Bias Collection",
      categoryId: input.categoryId,
      tags: input.tags || "",
      originalPrice: input.originalPrice,
      salePrice: input.salePrice ?? null,
      costPrice: input.costPrice ?? null,
      stock: input.variants.length ? existing.stock : input.stock,
      lowStockThreshold: input.lowStockThreshold,
      weight: input.weight ?? null,
      status: input.status,
      isFeatured: input.isFeatured,
      isNewArrival: input.isNewArrival,
      isBestSeller: input.isBestSeller,
      allowBackorder: input.allowBackorder,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      images: { create: input.images.map((img, i) => ({ url: img.url, alt: img.alt || input.name, sortOrder: img.sortOrder ?? i })) },
    },
    include: { images: true, variants: true },
  });
}

export async function archiveProduct(id: string) {
  return prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
}

export async function adminListProducts(opts: { q?: string; status?: string; page?: number; limit?: number }) {
  const { q, status, page = 1, limit = 15 } = opts;
  const where: any = {};
  if (status && status !== "ALL") where.status = status;
  if (q) where.OR = [{ name: { contains: q } }, { sku: { contains: q } }, { brand: { contains: q } }];
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    items: rows.map((p) => ({
      ...p,
      totalStock: p.variants.length ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
