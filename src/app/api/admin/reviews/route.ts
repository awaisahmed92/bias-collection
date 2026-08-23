import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import prisma from "@/lib/db";

export const GET = handle(async (req: Request) => {
  const auth = await requirePermission("reviews.manage");
  if ("response" in auth) return auth.response;
  const status = new URL(req.url).searchParams.get("status") || "ALL";
  const where: any = {};
  if (status !== "ALL") where.status = status;
  const reviews = await prisma.review.findMany({
    where,
    include: { product: { select: { name: true, slug: true } }, user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok({ reviews });
});

export const PATCH = handle(async (req: Request) => {
  const auth = await requirePermission("reviews.manage");
  if ("response" in auth) return auth.response;
  const { id, status } = await req.json();
  if (!id || !["APPROVED", "REJECTED", "PENDING"].includes(status)) return fail("id and valid status required.");
  const review = await prisma.review.update({ where: { id }, data: { status } });
  await audit(auth.session.id, "moderate", "review", id, status);
  return ok({ review });
});

export const DELETE = handle(async (req: Request) => {
  const auth = await requirePermission("reviews.manage");
  if ("response" in auth) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("id required");
  await prisma.review.delete({ where: { id } });
  await audit(auth.session.id, "delete", "review", id);
  return ok({ deleted: true });
});
