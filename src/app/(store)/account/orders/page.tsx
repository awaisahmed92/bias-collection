import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { customerOrders } from "@/services/order.service";
import { formatMoney, formatDate, orderStatusColor, paymentStatusColor } from "@/lib/utils";
import { EmptyState } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const orders = await customerOrders(session.id);

  return (
    <div>
      <h2 className="font-serif text-2xl">Order History</h2>
      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No orders yet" hint="Your purchases will appear here." action={<Link href="/shop" className="btn-primary">Shop Now</Link>} />
        </div>
      ) : (
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-line bg-off">
                <th className="admin-th">Order</th>
                <th className="admin-th">Date</th>
                <th className="admin-th">Status</th>
                <th className="admin-th">Payment</th>
                <th className="admin-th text-right">Total</th>
                <th className="admin-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="admin-td font-semibold">{o.orderNumber}</td>
                  <td className="admin-td text-ink/60">{formatDate(o.placedAt)}</td>
                  <td className="admin-td"><span className={`badge ${orderStatusColor(o.status)}`}>{o.status}</span></td>
                  <td className="admin-td"><span className={`badge ${paymentStatusColor(o.paymentStatus)}`}>{o.paymentStatus}</span></td>
                  <td className="admin-td text-right font-semibold">{formatMoney(o.total)}</td>
                  <td className="admin-td text-right">
                    <Link href={`/account/orders/${o.orderNumber}`} className="text-[11px] font-bold uppercase tracking-[0.14em] text-claydark hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
