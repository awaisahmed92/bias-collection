import { handle, ok } from "@/lib/api";
import { autocomplete } from "@/services/product.service";

export const GET = handle(async (req: Request) => {
  const q = new URL(req.url).searchParams.get("q") || "";
  return ok({ suggestions: await autocomplete(q) });
});
