import Link from "next/link";
import { requireAuth } from "@/lib/auth-helpers";
import { adminListOrders } from "@/services/order.service";
import { formatMoney, formatDateTime, orderStatusColor, paymentStatusColor, ORDER_STATUSES, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Record<string, string> }) {
  await requireAuth();
  const { items, total, page, pages } = await adminListOrders({
    q: searchParams.q,
    status: searchParams.status,
    paymentMethod: searchParams.paymentMethod,
    paymentStatus: searchParams.paymentStatus,
    from: searchParams.from,
    to: searchParams.to,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  const pageHref = (p: number) => {
    const params = new URLSearchParams(searchParams as any);
    params.set("page", String(p));
    return `/admin/orders?${params}`;
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Orders</h1>
          <p className="text-sm text-ink/50">{total} total</p>
        </div>
        <a href={`/api/admin/reports/sales?preset=custom&from=${searchParams.from || ""}&to=${searchParams.to || ""}&format=csv`} className="admin-btn-outline">
          Export CSV
        </a>
      </div>

      <form method="GET" className="mb-4 flex flex-wrap items-end gap-3">
        <input name="q" defaultValue={searchParams.q} placeholder="Order #, name, email, phone…" className="admin-input max-w-xs" />
        <div>
          <label className="admin-label">Status</label>
          <select name="status" defaultValue={searchParams.status || "ALL"} className="admin-input">
            <option value="ALL">All</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="admin-label">Payment</label>
          <select name="paymentMethod" defaultValue={searchParams.paymentMethod || "ALL"} className="admin-input">
            <option value="ALL">All</option>
            <option value="cod">Cash on Delivery</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
            <option value="wallet">Wallet</option>
          </select>
        </div>
        <div>
          <label className="admin-label">From</label>
          <input type="date" name="from" defaultValue={searchParams.from} className="admin-input" />
        </div>
        <div>
          <label className="admin-label">To</label>
          <input type="date" name="to" defaultValue={searchParams.to} className="admin-input" />
        </div>
        <button className="admin-btn-outline">Filter</button>
      </form>

      <div className="admin-card overflow-x-auto p-0">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-line bg-off">
              <th className="admin-th">Order</th><th className="admin-th">Customer</th><th className="admin-th">Items</th>
              <th className="admin-th">Payment</th><th className="admin-th">Status</th><th className="admin-th text-right">Total</th><th className="admin-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((o) => (
              <tr key={o.id} className="hover:bg-off/50">
                <td className="admin-td">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold text-claydark hover:underline">{o.orderNumber}</Link>
                  <p className="text-xs text-ink/40">{formatDateTime(o.placedAt)}</p>
                </td>
                <td className="admin-td">
                  {o.customerFirstName} {o.customerLastName}
                  <p className="text-xs text-ink/40">{o.shippingCity}</p>
                </td>
                <td className="admin-td">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="admin-td">
                  <span className={`badge ${paymentStatusColor(o.paymentStatus)}`}>{o.paymentStatus}</span>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink/40">{o.paymentMethod.replace("_", " ")}</p>
                </td>
                <td className="admin-td"><span className={`badge ${orderStatusColor(o.status)}`}>{o.status}</span></td>
                <td className="admin-td text-right font-semibold">{formatMoney(o.total)}</td>
                <td className="admin-td text-right">
                  <Link href={`/admin/orders/${o.id}`} className="text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline">Manage →</Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="admin-td py-10 text-center text-ink/40">No orders match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <Link key={i} href={pageHref(i + 1)} className={cn("border px-3 py-1.5 text-xs font-semibold", page === i + 1 ? "border-ink bg-ink text-cream" : "border-line bg-white")}>
              {i + 1}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
