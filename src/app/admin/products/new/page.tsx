import { requireAuth } from "@/lib/auth-helpers";
import { listAllFlat } from "@/services/category.service";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAuth();
  const categories = await listAllFlat(true);
  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl">New Product</h1>
      <ProductForm categories={JSON.parse(JSON.stringify(categories))} />
    </div>
  );
}
