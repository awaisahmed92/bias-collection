import { requireAuth } from "@/lib/auth-helpers";
import { listSections } from "@/services/cms.service";
import prisma from "@/lib/db";
import HomepageClient from "@/components/admin/HomepageClient";

export const dynamic = "force-dynamic";

export default async function AdminHomepagePage() {
  await requireAuth();
  const [sections, products, categories] = await Promise.all([
    listSections(),
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { isActive: true, parentId: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <HomepageClient
      sections={JSON.parse(JSON.stringify(sections))}
      products={products}
      categories={categories}
    />
  );
}
