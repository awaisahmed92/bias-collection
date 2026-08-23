import { requireAuth } from "@/lib/auth-helpers";
import { listAllFlat } from "@/services/category.service";
import CategoriesClient from "@/components/admin/CategoriesClient";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAuth();
  const categories = await listAllFlat(true);
  return <CategoriesClient initial={JSON.parse(JSON.stringify(categories))} />;
}
