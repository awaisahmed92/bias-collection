import { handle, ok, requirePermission } from "@/lib/api";
import prisma from "@/lib/db";

export const GET = handle(async (req: Request) => {
  const auth = await requirePermission("customers.view");
  if ("response" in auth) return auth.response;
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") || "";
  const page = sp.get("page") ? Number(sp.get("page")) : 1;
  const limit = 15;

  const where: any = { role: { name: "customer" } };
  if (q) where.OR = [{ email: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }, { phone: { contains: q } }];

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, isActive: true, createdAt: true, lastLoginAt: true,
      },
    }),
  ]);

  const enriched = await Promise.all(
    users.map(async (u) => {
      const agg = await prisma.order.aggregate({
        _count: true,
        _sum: { total: true },
        where: { userId: u.id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      });
      const last = await prisma.order.findFirst({ where: { userId: u.id }, orderBy: { placedAt: "desc" }, select: { placedAt: true } });
      return { ...u, totalOrders: agg._count, totalSpent: agg._sum.total ?? 0, lastOrderAt: last?.placedAt ?? null };
    })
  );

  return ok({ items: enriched, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});
