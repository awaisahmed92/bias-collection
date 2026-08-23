import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { listAllFlat } from "@/services/category.service";
import prisma from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id }, include: { images: { orderBy: { sortOrder: "asc" } }, variants: true } }),
    listAllFlat(true),
  ]);
  if (!product) notFound();
  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl">Edit: {product.name}</h1>
      <ProductForm categories={JSON.parse(JSON.stringify(categories))} initial={JSON.parse(JSON.stringify(product))} />
    </div>
  );
}
