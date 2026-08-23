import { z } from "zod";
import prisma from "@/lib/db";
import { slugify } from "@/lib/utils";

export const categoryInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export async function listCategories(includeInactive = false) {
  const rows = await prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      children: { orderBy: [{ displayOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } },
      parent: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true } },
    },
  });
  return rows.filter((r) => !r.parentId);
}

export async function listAllFlat(includeInactive = true) {
  return prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { parent: { select: { name: true } }, _count: { select: { products: true } } },
  });
}

async function uniqueSlug(base: string, ignoreId?: string) {
  let slug = slugify(base) || `category-${Date.now()}`;
  let i = 1;
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${slugify(base)}-${++i}`;
  }
}

export async function createCategory(raw: unknown) {
  const input = categoryInputSchema.parse(raw);
  const slug = await uniqueSlug(input.slug || input.name);
  return prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description || null,
      image: input.image || null,
      parentId: input.parentId || null,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
    },
  });
}

export async function updateCategory(id: string, raw: unknown) {
  const input = categoryInputSchema.parse(raw);
  if (input.parentId === id) throw new Error("A category cannot be its own parent.");
  const slug = await uniqueSlug(input.slug || input.name, id);
  return prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      slug,
      description: input.description || null,
      image: input.image || null,
      parentId: input.parentId || null,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
    },
  });
}

export async function deleteCategory(id: string) {
  const cat = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!cat) throw new Error("Category not found.");
  if (cat._count.products > 0)
    throw new Error(`Cannot delete: ${cat._count.products} product(s) still use this category. Disable it instead.`);
  if (cat._count.children > 0)
    throw new Error("Cannot delete: sub-categories exist. Move or delete them first.");
  return prisma.category.delete({ where: { id } });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: { children: { where: { isActive: true } }, parent: true },
  });
}
