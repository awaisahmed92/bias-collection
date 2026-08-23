import { z } from "zod";
import prisma from "@/lib/db";
import { getActivePromotions, decorateProduct } from "./index-helpers";

export const bannerInputSchema = z.object({
  title: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  desktopImage: z.string().min(1, "Desktop image required"),
  mobileImage: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  buttonText: z.string().optional().nullable(),
  position: z.enum(["HOME_HERO", "HOME_MIDDLE", "CATEGORY_PAGE", "PRODUCT_PAGE", "SALE_PAGE"]),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const sectionInputSchema = z.object({
  type: z.enum(["HERO", "CATEGORY_GRID", "NEW_ARRIVALS", "FEATURED_PRODUCTS", "PROMO_BANNER", "BEST_SELLERS", "SALE_BANNER", "NEWSLETTER"]),
  title: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  buttonText: z.string().optional().nullable(),
  buttonLink: z.string().optional().nullable(),
  configJson: z.string().default("{}"),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

function dates(d?: string | null) {
  return d ? new Date(d) : null;
}

export function bannerIsLive(b: { isActive: boolean; startDate: Date | null; endDate: Date | null }) {
  const now = new Date();
  return b.isActive && (!b.startDate || b.startDate <= now) && (!b.endDate || b.endDate >= now);
}

// Banners
export async function listBanners() {
  const rows = await prisma.banner.findMany({ orderBy: [{ position: "asc" }, { displayOrder: "asc" }] });
  return rows.map((b) => ({ ...b, live: bannerIsLive(b) }));
}

export async function bannersForPosition(position: string) {
  const rows = await prisma.banner.findMany({ where: { position }, orderBy: { displayOrder: "asc" } });
  return rows.filter(bannerIsLive);
}

export async function createBanner(raw: unknown) {
  const input = bannerInputSchema.parse(raw);
  return prisma.banner.create({
    data: {
      title: input.title || null,
      subtitle: input.subtitle || null,
      desktopImage: input.desktopImage,
      mobileImage: input.mobileImage || null,
      linkUrl: input.linkUrl || null,
      buttonText: input.buttonText || null,
      position: input.position,
      startDate: dates(input.startDate),
      endDate: dates(input.endDate),
      displayOrder: input.displayOrder,
      isActive: input.isActive,
    },
  });
}

export async function updateBanner(id: string, raw: unknown) {
  const input = bannerInputSchema.parse(raw);
  return prisma.banner.update({
    where: { id },
    data: {
      title: input.title || null,
      subtitle: input.subtitle || null,
      desktopImage: input.desktopImage,
      mobileImage: input.mobileImage || null,
      linkUrl: input.linkUrl || null,
      buttonText: input.buttonText || null,
      position: input.position,
      startDate: dates(input.startDate),
      endDate: dates(input.endDate),
      displayOrder: input.displayOrder,
      isActive: input.isActive,
    },
  });
}

export async function deleteBanner(id: string) {
  return prisma.banner.delete({ where: { id } });
}

// Homepage sections
export async function listSections() {
  return prisma.homepageSection.findMany({ orderBy: { displayOrder: "asc" } });
}

export async function activeSections() {
  return prisma.homepageSection.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } });
}

export async function updateSection(id: string, raw: unknown) {
  const input = sectionInputSchema.parse(raw);
  return prisma.homepageSection.update({
    where: { id },
    data: {
      type: input.type,
      title: input.title || null,
      subtitle: input.subtitle || null,
      image: input.image || null,
      buttonText: input.buttonText || null,
      buttonLink: input.buttonLink || null,
      configJson: input.configJson || "{}",
      displayOrder: input.displayOrder,
      isActive: input.isActive,
    },
  });
}

export async function createSection(raw: unknown) {
  const input = sectionInputSchema.parse(raw);
  return prisma.homepageSection.create({
    data: {
      type: input.type,
      title: input.title || null,
      subtitle: input.subtitle || null,
      image: input.image || null,
      buttonText: input.buttonText || null,
      buttonLink: input.buttonLink || null,
      configJson: input.configJson || "{}",
      displayOrder: input.displayOrder,
      isActive: input.isActive,
    },
  });
}

export async function deleteSection(id: string) {
  return prisma.homepageSection.delete({ where: { id } });
}

/** Resolve a section's dynamic payload (products / categories) for the storefront. */
export async function resolveSection(section: {
  type: string;
  configJson: string;
}) {
  let cfg: any = {};
  try {
    cfg = JSON.parse(section.configJson || "{}");
  } catch {}

  const promos = await getActivePromotions();

  if (section.type === "NEW_ARRIVALS") {
    const max = Number(cfg.maxItems) || 8;
    let products;
    if (Array.isArray(cfg.productIds) && cfg.productIds.length) {
      products = await prisma.product.findMany({
        where: { id: { in: cfg.productIds }, status: "ACTIVE" },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 2 }, variants: { where: { isActive: true } }, category: true },
      });
    } else {
      products = await prisma.product.findMany({
        where: { status: "ACTIVE", isNewArrival: true },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 2 }, variants: { where: { isActive: true } }, category: true },
        orderBy: { createdAt: "desc" },
        take: max,
      });
    }
    return { products: products.map((p) => decorateProduct(p, promos)) };
  }

  if (section.type === "FEATURED_PRODUCTS") {
    let products;
    if (Array.isArray(cfg.productIds) && cfg.productIds.length) {
      products = await prisma.product.findMany({
        where: { id: { in: cfg.productIds }, status: "ACTIVE" },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 2 }, variants: { where: { isActive: true } }, category: true },
      });
      // keep admin's chosen order
      const order = cfg.productIds as string[];
      products.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    } else {
      products = await prisma.product.findMany({
        where: { status: "ACTIVE", isFeatured: true },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 2 }, variants: { where: { isActive: true } }, category: true },
        take: Number(cfg.maxItems) || 8,
      });
    }
    return { products: products.map((p) => decorateProduct(p, promos)) };
  }

  if (section.type === "BEST_SELLERS") {
    let products;
    if (Array.isArray(cfg.productIds) && cfg.productIds.length) {
      products = await prisma.product.findMany({
        where: { id: { in: cfg.productIds }, status: "ACTIVE" },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 2 }, variants: { where: { isActive: true } }, category: true },
      });
    } else {
      const manual = await prisma.product.findMany({
        where: { status: "ACTIVE", isBestSeller: true },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 2 }, variants: { where: { isActive: true } }, category: true },
      });
      const auto = await prisma.product.findMany({
        where: { status: "ACTIVE", isBestSeller: false },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 2 }, variants: { where: { isActive: true } }, category: true },
        orderBy: { soldCount: "desc" },
        take: Math.max(0, (Number(cfg.maxItems) || 8) - manual.length),
      });
      products = [...manual, ...auto];
    }
    return { products: products.map((p) => decorateProduct(p, promos)) };
  }

  if (section.type === "CATEGORY_GRID") {
    let categories;
    if (Array.isArray(cfg.categoryIds) && cfg.categoryIds.length) {
      categories = await prisma.category.findMany({ where: { id: { in: cfg.categoryIds }, isActive: true } });
    } else {
      categories = await prisma.category.findMany({
        where: { isActive: true, parentId: null },
        orderBy: { displayOrder: "asc" },
        take: Number(cfg.maxItems) || 5,
      });
    }
    return { categories };
  }

  return {};
}
