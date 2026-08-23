import { requireAuth } from "@/lib/auth-helpers";
import { listCoupons } from "@/services/coupon.service";
import prisma from "@/lib/db";
import CouponsClient from "@/components/admin/CouponsClient";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireAuth();
  const [coupons, products, categories] = await Promise.all([
    listCoupons(),
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <CouponsClient
      coupons={JSON.parse(JSON.stringify(coupons))}
      products={products}
      categories={categories}
    />
  );
}
