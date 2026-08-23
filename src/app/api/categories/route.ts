import { handle, ok } from "@/lib/api";
import { listCategories } from "@/services/category.service";

export const GET = handle(async () => {
  return ok({ categories: await listCategories(false) });
});
