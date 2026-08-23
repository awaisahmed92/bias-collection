import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import prisma from "@/lib/db";

type Ctx = { params: { id: string } };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const auth = await requirePermission("customers.view");
  if ("response" in auth) return auth.response;
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      addresses: true,
      orders: { orderBy: { placedAt: "desc" }, include: { items: true } },
      reviews: { include: { product: { select: { name: true } } } },
      role: true,
    },
  });
  if (!user) return fail("Customer not found.", 404);
  const agg = await prisma.order.aggregate({
    _count: true,
    _sum: { total: true },
    where: { userId: user.id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
  });
  const { passwordHash, ...safe } = user;
  return ok({ customer: { ...safe, totalOrders: agg._count, totalSpent: agg._sum.total ?? 0 } });
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const auth = await requirePermission("customers.manage");
  if ("response" in auth) return auth.response;
  const body = await req.json();
  const user = await prisma.user.update({
    where: { id: params.id },
    data: { isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined },
  });
  await audit(auth.session.id, "update", "customer", params.id, `isActive=${user.isActive}`);
  return ok({ customer: { id: user.id, isActive: user.isActive } });
});
