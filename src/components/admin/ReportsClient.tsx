"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatMoney, formatDate, cn, orderStatusColor } from "@/lib/utils";

export default function ReportsClient({ report, preset, from, to }: { report: any; preset: string; from?: string; to?: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const goto = (patch: Record<string, string>) => {
    const params = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => params.set(k, v));
    router.push(`/admin/reports?${params}`);
  };

  const csvUrl = `/api/admin/reports/sales?preset=${preset}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}&format=csv`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl">Reports & Analytics</h1>
        <a href={csvUrl} className="admin-btn-outline">Download CSV</a>
      </div>

      {/* presets */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        {[
          ["today", "Today"],
          ["yesterday", "Yesterday"],
          ["week", "This Week"],
          ["month", "This Month"],
          ["custom", "Custom"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => goto({ preset: k })}
            className={cn("border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em]", preset === k ? "border-ink bg-ink text-cream" : "border-line bg-white hover:border-ink")}
          >
            {label}
          </button>
        ))}
        {preset === "custom" && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              goto({ preset: "custom", from: String(fd.get("from")), to: String(fd.get("to")) });
            }}
          >
            <div><label className="admin-label">From</label><input type="date" name="from" defaultValue={from} className="admin-input" required /></div>
            <div><label className="admin-label">To</label><input type="date" name="to" defaultValue={to} className="admin-input" required /></div>
            <button className="admin-btn-outline">Apply</button>
          </form>
        )}
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          ["Revenue", formatMoney(report.summary.revenue)],
          ["Orders", String(report.summary.totalOrders)],
          ["Items Sold", String(report.summary.itemsSold)],
          ["Avg. Order Value", formatMoney(report.summary.avgOrderValue)],
          ["Cancelled", String(report.summary.cancelled)],
        ].map(([l, v]) => (
          <div key={l} className="admin-card">
            <p className="admin-label">{l}</p>
            <p className="font-serif text-2xl">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* daily table */}
        <div className="admin-card overflow-x-auto p-0 lg:col-span-2">
          <p className="border-b border-line px-5 py-3 font-serif text-lg">Daily Breakdown</p>
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-line bg-off">
                <th className="admin-th">Date</th><th className="admin-th text-right">Orders</th><th className="admin-th text-right">Items</th><th className="admin-th text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.days.map((d: any) => (
                <tr key={d.date}>
                  <td className="admin-td">{formatDate(d.date)}</td>
                  <td className="admin-td text-right">{d.orders}</td>
                  <td className="admin-td text-right">{d.items}</td>
                  <td className="admin-td text-right font-semibold">{formatMoney(d.revenue)}</td>
                </tr>
              ))}
              {report.days.length === 0 && <tr><td colSpan={4} className="admin-td py-8 text-center text-ink/40">No orders in this period.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="admin-card">
            <p className="mb-3 font-serif text-lg">By Payment Method</p>
            {report.summary.byPayment.map((p: any) => (
              <div key={p.method} className="flex justify-between border-b border-line/60 py-2 text-sm last:border-0">
                <span className="capitalize">{p.method.replace("_", " ")}</span>
                <span className="text-ink/60">{p.count} orders · <b className="text-ink">{formatMoney(p.revenue)}</b></span>
              </div>
            ))}
          </div>
          <div className="admin-card">
            <p className="mb-3 font-serif text-lg">By Status</p>
            {report.summary.byStatus.map((s: any) => (
              <div key={s.status} className="flex justify-between border-b border-line/60 py-2 text-sm last:border-0">
                <span className={`badge ${orderStatusColor(s.status)}`}>{s.status}</span>
                <span className="font-semibold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* orders table */}
      <div className="admin-card mt-6 overflow-x-auto p-0">
        <p className="border-b border-line px-5 py-3 font-serif text-lg">Orders in Period ({report.orders.length})</p>
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-line bg-off">
              <th className="admin-th">Order</th><th className="admin-th">Date</th><th className="admin-th">Customer</th>
              <th className="admin-th">Status</th><th className="admin-th">Payment</th><th className="admin-th text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {report.orders.slice(0, 100).map((o: any) => (
              <tr key={o.id} className="hover:bg-off/50">
                <td className="admin-td"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-claydark hover:underline">{o.orderNumber}</Link></td>
                <td className="admin-td text-ink/60">{formatDate(o.placedAt)}</td>
                <td className="admin-td">{o.customerFirstName} {o.customerLastName}</td>
                <td className="admin-td"><span className={`badge ${orderStatusColor(o.status)}`}>{o.status}</span></td>
                <td className="admin-td text-xs uppercase text-ink/50">{o.paymentMethod.replace("_", " ")}</td>
                <td className="admin-td text-right font-semibold">{formatMoney(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
