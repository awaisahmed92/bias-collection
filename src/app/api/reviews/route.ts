import { z } from "zod";
import { handle, ok, fail } from "@/lib/api";
import { requireAuth } from "@/lib/api";
import prisma from "@/lib/db";

const schema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
});

export const POST = handle(async (req: Request) => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  const input = schema.parse(await req.json());

  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) return fail("Product not found.", 404);

  const already = await prisma.review.findFirst({
    where: { productId: input.productId, userId: auth.session.id },
  });
  if (already) return fail("You have already reviewed this product.");

  // verified purchase check
  const purchased = await prisma.order.findFirst({
    where: {
      userId: auth.session.id,
      status: { in: ["DELIVERED", "SHIPPED"] },
      items: { some: { productId: input.productId } },
    },
  });

  await prisma.review.create({
    data: {
      productId: input.productId,
      userId: auth.session.id,
      rating: input.rating,
      comment: input.comment || null,
      // auto-approve verified purchases; others await moderation
      status: purchased ? "APPROVED" : "PENDING",
    },
  });

  return ok({
    created: true,
    message: purchased
      ? "Thanks! Your verified review is now live."
      : "Thanks! Your review was submitted and is awaiting moderation.",
  });
});
