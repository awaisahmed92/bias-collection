import Link from "next/link";
import { requireAuth, isStaff } from "@/lib/auth-helpers";
import { dashboardStats } from "@/services/analytics.service";
import { lowStockList } from "@/services/inventory.service";
import StatCard from "@/components/admin/StatCard";
import { RevenueBarChart, MiniDonut } from "@/components/admin/Charts";
import { formatMoney, formatDate, orderStatusColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PALETTE = ["#8f6b4f", "#17130e", "#9c7c2e", "#b08968", "#6b5b4a"];

export default async function AdminDashboard() {
  await requireAuth();
  const [stats, lowStock] = await Promise.all([dashboardStats(), lowStockList()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <Link href="/admin/products/new" className="admin-btn">+ New Product</Link>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Today's Sales" value={formatMoney(stats.todaySales)} hint={`${stats.todayOrders} order(s)`} accent />
        <StatCard label="Total Revenue" value={formatMoney(stats.totalRevenue)} />
        <StatCard label="Total Orders" value={String(stats.totalOrders)} />
        <StatCard label="Pending Orders" value={String(stats.pendingOrders)} hint="Need confirmation" />
        <StatCard label="Customers" value={String(stats.totalCustomers)} />
        <StatCard label="Low Stock Alerts" value={String(lowStock.length)} hint={`${lowStock.filter((l) => l.level === "OUT").length} out of stock`} />
      </div>

      {/* charts row */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="admin-card xl:col-span-2">
          <h2 className="mb-4 font-serif text-lg">Revenue — Last 12 Months</h2>
          <RevenueBarChart data={stats.months} />
        </div>
        <div className="admin-card">
          <h2 className="mb-4 font-serif text-lg">Top Categories</h2>
          {stats.topCategories.length ? (
            <MiniDonut parts={stats.topCategories.map((c, i) => ({ name: c.name, value: c.revenue, color: PALETTE[i % PALETTE.length] }))} />
          ) : (
            <p className="text-sm text-ink/40">No sales yet.</p>
          )}
        </div>
      </div>

      {/* tables row */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="admin-card xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg">Recent Orders</h2>
            <Link href="/admin/orders" className="text-[11px] font-bold uppercase tracking-[0.14em] text-claydark hover:underline">View All →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="admin-th">Order</th><th className="admin-th">Customer</th><th className="admin-th">Status</th><th className="admin-th text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-off/60">
                    <td className="admin-td">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-claydark hover:underline">{o.orderNumber}</Link>
                      <p className="text-xs text-ink/40">{formatDate(o.placedAt)}</p>
                    </td>
                    <td className="admin-td">{o.customerFirstName} {o.customerLastName}</td>
                    <td className="admin-td"><span className={`badge ${orderStatusColor(o.status)}`}>{o.status}</span></td>
                    <td className="admin-td text-right font-semibold">{formatMoney(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg">Low Stock</h2>
            <Link href="/admin/inventory" className="text-[11px] font-bold uppercase tracking-[0.14em] text-claydark hover:underline">Inventory →</Link>
          </div>
          <div className="space-y-2.5">
            {lowStock.slice(0, 6).map((l, i) => (
              <Link key={i} href={`/admin/products/${l.productId}`} className="flex items-center gap-3 border border-line p-2.5 hover:border-ink">
                <div className="h-10 w-8 shrink-0 overflow-hidden bg-sand">{l.image && <img src={l.image} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.name}{l.variantName ? ` — ${l.variantName}` : ""}</p>
                  <p className="text-xs text-ink/40">{l.sku}</p>
                </div>
                <span className={`badge ${l.level === "OUT" ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-800"}`}>{l.level === "OUT" ? "Out" : `${l.stock} left`}</span>
              </Link>
            ))}
            {lowStock.length === 0 && <p className="text-sm text-ink/40">Stock levels are healthy. ✓</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="admin-card">
          <h2 className="mb-3 font-serif text-lg">Top Products</h2>
          <table className="w-full">
            <tbody className="divide-y divide-line">
              {stats.topProducts.map((p, i) => (
                <tr key={i}>
                  <td className="admin-td"><span className="mr-2 font-serif text-ink/30">{i + 1}</span>{p.name}</td>
                  <td className="admin-td text-right text-ink/60">{p.qty} sold</td>
                  <td className="admin-td text-right font-semibold">{formatMoney(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-card">
          <h2 className="mb-3 font-serif text-lg">Top Customers</h2>
          <table className="w-full">
            <tbody className="divide-y divide-line">
              {stats.topCustomers.map((c, i) => (
                <tr key={i}>
                  <td className="admin-td">{c.name}<p className="text-xs text-ink/40">{c.email}</p></td>
                  <td className="admin-td text-right text-ink/60">{c.orders} orders</td>
                  <td className="admin-td text-right font-semibold">{formatMoney(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
