import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { formatMoney, formatDate, orderStatusColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [orders, wishlistCount, addressCount] = await Promise.all([
    prisma.order.findMany({ where: { userId: session.id }, orderBy: { placedAt: "desc" }, take: 3, include: { items: true } }),
    prisma.wishlistItem.count({ where: { userId: session.id } }),
    prisma.address.count({ where: { userId: session.id } }),
  ]);
  const totalSpent = await prisma.order.aggregate({
    _sum: { total: true },
    where: { userId: session.id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
  });

  const cards = [
    { label: "Orders", value: String(orders.length ? await prisma.order.count({ where: { userId: session.id } }) : 0), href: "/account/orders" },
    { label: "Total Spent", value: formatMoney(totalSpent._sum.total ?? 0), href: "/account/orders" },
    { label: "Wishlist", value: String(wishlistCount), href: "/account/wishlist" },
    { label: "Addresses", value: String(addressCount), href: "/account/addresses" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-5 transition-colors hover:border-ink">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink/50">{c.label}</p>
            <p className="mt-1 font-serif text-2xl">{c.value}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 font-serif text-2xl">Recent Orders</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-ink/50">
          No orders yet — <Link href="/shop" className="font-semibold underline underline-offset-4">start shopping</Link>.
        </p>
      ) : (
        <div className="card mt-4 divide-y divide-line">
          {orders.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.orderNumber}`} className="flex items-center justify-between gap-4 p-4 hover:bg-off">
              <div>
                <p className="text-sm font-semibold">{o.orderNumber}</p>
                <p className="text-xs text-ink/50">{formatDate(o.placedAt)} · {o.items.length} item(s)</p>
              </div>
              <div className="text-right">
                <span className={`badge ${orderStatusColor(o.status)}`}>{o.status}</span>
                <p className="mt-1 text-sm font-semibold">{formatMoney(o.total)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
