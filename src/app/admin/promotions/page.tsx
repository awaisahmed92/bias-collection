import { requireAuth } from "@/lib/auth-helpers";
import { listPromotions } from "@/services/promotion.service";
import prisma from "@/lib/db";
import PromotionsClient from "@/components/admin/PromotionsClient";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  await requireAuth();
  const [promotions, products, categories] = await Promise.all([
    listPromotions(),
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <PromotionsClient
      promotions={JSON.parse(JSON.stringify(promotions))}
      products={products}
      categories={categories}
    />
  );
}
