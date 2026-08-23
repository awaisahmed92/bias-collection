import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import { updateProduct, archiveProduct } from "@/services/product.service";
import prisma from "@/lib/db";

type Ctx = { params: { id: string } };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const auth = await requirePermission("products.view");
  if ("response" in auth) return auth.response;
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { images: { orderBy: { sortOrder: "asc" } }, variants: true, category: true },
  });
  if (!product) return fail("Product not found.", 404);
  return ok({ product });
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const auth = await requirePermission("products.update");
  if ("response" in auth) return auth.response;
  try {
    const product = await updateProduct(params.id, await req.json(), auth.session.id);
    await audit(auth.session.id, "update", "product", params.id, product.name);
    return ok({ product });
  } catch (e: any) {
    if (e?.name === "ZodError") throw e;
    return fail(e.message || "Could not update product.", 400);
  }
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const auth = await requirePermission("products.delete");
  if ("response" in auth) return auth.response;
  await archiveProduct(params.id);
  await audit(auth.session.id, "archive", "product", params.id);
  return ok({ archived: true });
});
