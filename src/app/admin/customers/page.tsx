import Link from "next/link";
import { requireAuth } from "@/lib/auth-helpers";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({ searchParams }: { searchParams: Record<string, string> }) {
  await requireAuth();
  const q = searchParams.q || "";
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const limit = 15;
  const where: any = { role: { name: "customer" } };
  if (q) where.OR = [{ email: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }];

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
  ]);

  const items = await Promise.all(
    users.map(async (u) => {
      const agg = await prisma.order.aggregate({ _count: true, _sum: { total: true }, where: { userId: u.id, status: { notIn: ["CANCELLED", "REFUNDED"] } } });
      const last = await prisma.order.findFirst({ where: { userId: u.id }, orderBy: { placedAt: "desc" }, select: { placedAt: true } });
      return { ...u, totalOrders: agg._count, totalSpent: agg._sum.total ?? 0, lastOrderAt: last?.placedAt ?? null };
    })
  );
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Customers</h1>
          <p className="text-sm text-ink/50">{total} registered</p>
        </div>
        <form method="GET" className="flex gap-3">
          <input name="q" defaultValue={q} placeholder="Search name or email…" className="admin-input max-w-xs" />
          <button className="admin-btn-outline">Search</button>
        </form>
      </div>

      <div className="admin-card overflow-x-auto p-0">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-line bg-off">
              <th className="admin-th">Customer</th><th className="admin-th">Phone</th><th className="admin-th">Orders</th>
              <th className="admin-th">Total Spent</th><th className="admin-th">Last Order</th><th className="admin-th">Joined</th><th className="admin-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((c) => (
              <tr key={c.id} className="hover:bg-off/50">
                <td className="admin-td">
                  <p className="font-semibold">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-ink/40">{c.email}</p>
                </td>
                <td className="admin-td text-ink/60">{c.phone ?? "—"}</td>
                <td className="admin-td">{c.totalOrders}</td>
                <td className="admin-td font-semibold">{formatMoney(c.totalSpent)}</td>
                <td className="admin-td text-ink/60">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</td>
                <td className="admin-td text-ink/60">{formatDate(c.createdAt)}</td>
                <td className="admin-td text-right">
                  <Link href={`/admin/customers/${c.id}`} className="text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline">View →</Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="admin-td py-10 text-center text-ink/40">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <Link key={i} href={`/admin/customers?q=${q}&page=${i + 1}`} className={cn("border px-3 py-1.5 text-xs font-semibold", page === i + 1 ? "border-ink bg-ink text-cream" : "border-line bg-white")}>
              {i + 1}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
