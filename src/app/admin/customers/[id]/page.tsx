import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import prisma from "@/lib/db";
import { formatMoney, formatDate, formatDateTime, orderStatusColor } from "@/lib/utils";
import ToggleCustomerButton from "@/components/admin/ToggleCustomerButton";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetail({ params }: { params: { id: string } }) {
  await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { addresses: true, orders: { orderBy: { placedAt: "desc" }, include: { items: true } }, role: true },
  });
  if (!user) notFound();
  const agg = await prisma.order.aggregate({
    _count: true,
    _sum: { total: true },
    where: { userId: user.id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
  });

  return (
    <div>
      <Link href="/admin/customers" className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/50 hover:text-ink">← All Customers</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">{user.firstName} {user.lastName}</h1>
          <p className="text-sm text-ink/50">{user.email} {user.phone ? `· ${user.phone}` : ""} · joined {formatDate(user.createdAt)}</p>
        </div>
        <ToggleCustomerButton id={user.id} isActive={user.isActive} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="admin-card"><p className="admin-label">Orders</p><p className="font-serif text-2xl">{agg._count}</p></div>
        <div className="admin-card"><p className="admin-label">Total Spent</p><p className="font-serif text-2xl">{formatMoney(agg._sum.total ?? 0)}</p></div>
        <div className="admin-card"><p className="admin-label">Avg. Order</p><p className="font-serif text-2xl">{formatMoney(agg._count ? (agg._sum.total ?? 0) / agg._count : 0)}</p></div>
        <div className="admin-card"><p className="admin-label">Addresses</p><p className="font-serif text-2xl">{user.addresses.length}</p></div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="admin-card p-0">
          <p className="border-b border-line px-5 py-3 font-serif text-lg">Orders</p>
          <div className="divide-y divide-line">
            {user.orders.slice(0, 10).map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-off/60">
                <div>
                  <p className="text-sm font-semibold text-claydark">{o.orderNumber}</p>
                  <p className="text-xs text-ink/40">{formatDateTime(o.placedAt)} · {o.items.length} item(s)</p>
                </div>
                <div className="text-right">
                  <span className={`badge ${orderStatusColor(o.status)}`}>{o.status}</span>
                  <p className="mt-0.5 text-sm font-semibold">{formatMoney(o.total)}</p>
                </div>
              </Link>
            ))}
            {user.orders.length === 0 && <p className="px-5 py-6 text-sm text-ink/40">No orders yet.</p>}
          </div>
        </div>
        <div className="admin-card p-0">
          <p className="border-b border-line px-5 py-3 font-serif text-lg">Addresses</p>
          <div className="divide-y divide-line">
            {user.addresses.map((a) => (
              <div key={a.id} className="px-5 py-3 text-sm">
                <p className="font-semibold">{a.label}{a.isDefault ? " (default)" : ""}</p>
                <p className="text-ink/60">{a.address}, {a.area}, {a.city} {a.postalCode ?? ""}</p>
                <p className="text-ink/50">{a.phone}</p>
              </div>
            ))}
            {user.addresses.length === 0 && <p className="px-5 py-6 text-sm text-ink/40">No saved addresses.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
