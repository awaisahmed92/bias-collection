import { handle, ok, requirePermission } from "@/lib/api";
import prisma from "@/lib/db";

export const GET = handle(async (req: Request) => {
  const auth = await requirePermission("audit.view");
  if ("response" in auth) return auth.response;
  const sp = new URL(req.url).searchParams;
  const page = sp.get("page") ? Number(sp.get("page")) : 1;
  const limit = 40;
  const [total, items] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return ok({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});
