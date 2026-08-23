import { handle, ok, fail } from "@/lib/api";
import { requireAuth } from "@/lib/api";
import prisma from "@/lib/db";

export const GET = handle(async () => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  const items = await prisma.wishlistItem.findMany({
    where: { userId: auth.session.id },
    include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { where: { isActive: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return ok({ items });
});

export const POST = handle(async (req: Request) => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  const body = await req.json();

  // merge mode (guest wishlist → account after login)
  if (body.merge && Array.isArray(body.productIds)) {
    for (const productId of body.productIds.slice(0, 100)) {
      await prisma.wishlistItem.upsert({
        where: { userId_productId: { userId: auth.session.id, productId } },
        update: {},
        create: { userId: auth.session.id, productId },
      });
    }
    return ok({ merged: true });
  }

  const { productId } = body;
  if (!productId) return fail("productId required");
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: auth.session.id, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return ok({ wishlisted: false });
  }
  await prisma.wishlistItem.create({ data: { userId: auth.session.id, productId } });
  return ok({ wishlisted: true });
});

export const DELETE = handle(async (req: Request) => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  const productId = new URL(req.url).searchParams.get("productId");
  if (!productId) return fail("productId required");
  await prisma.wishlistItem.deleteMany({ where: { userId: auth.session.id, productId } });
  return ok({ removed: true });
});
