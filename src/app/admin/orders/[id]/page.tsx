import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { getOrderById } from "@/services/order.service";
import OrderAdminClient from "@/components/admin/OrderAdminClient";
import { IconPrint } from "@/components/ui/icons";
import PrintButton from "@/components/admin/PrintButton";
import { formatMoney, formatDateTime, orderStatusColor, paymentStatusColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: { id: string } }) {
  await requireAuth();
  const order = await getOrderById(params.id);
  if (!order) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <Link href="/admin/orders" className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/50 hover:text-ink">← All Orders</Link>
          <h1 className="mt-1 font-serif text-3xl">{order.orderNumber}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${orderStatusColor(order.status)} !px-3 !py-1 !text-[11px]`}>{order.status}</span>
          <PrintButton />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* invoice / details */}
        <div id="invoice" className="space-y-6 bg-white">
          <div className="admin-card">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <p className="font-serif text-2xl font-semibold tracking-[0.08em]">BIAS</p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.42em] text-ink/50">Collection</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-bold">INVOICE {order.orderNumber}</p>
                <p className="text-ink/50">{formatDateTime(order.placedAt)}</p>
                <p className="mt-1"><span className={`badge ${paymentStatusColor(order.paymentStatus)}`}>{order.paymentStatus}</span></p>
              </div>
            </div>

            <div className="grid gap-6 border-b border-line py-4 sm:grid-cols-2">
              <div>
                <p className="admin-label">Bill To</p>
                <p className="text-sm font-semibold">{order.customerFirstName} {order.customerLastName}</p>
                <p className="text-sm text-ink/60">{order.email}</p>
                <p className="text-sm text-ink/60">{order.phone}</p>
              </div>
              <div>
                <p className="admin-label">Ship To</p>
                <p className="text-sm text-ink/70">
                  {order.shippingAddress}, {order.shippingArea}<br />
                  {order.shippingCity}, {order.shippingCountry} {order.shippingPostalCode ?? ""}
                </p>
                <p className="mt-1 text-xs text-ink/40">{order.shippingMethodName}</p>
              </div>
            </div>

            <table className="mt-4 w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="admin-th">Item</th><th className="admin-th">SKU</th><th className="admin-th text-center">Qty</th>
                  <th className="admin-th text-right">Unit</th><th className="admin-th text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="admin-td">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-9 shrink-0 overflow-hidden bg-sand">{item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}</div>
                        <div>
                          <p className="text-sm font-semibold">{item.productName}</p>
                          {item.variantName && <p className="text-xs text-ink/50">{item.variantName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="admin-td text-xs text-ink/50">{item.sku}</td>
                    <td className="admin-td text-center">{item.quantity}</td>
                    <td className="admin-td text-right">{formatMoney(item.finalPrice)}</td>
                    <td className="admin-td text-right font-semibold">{formatMoney(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink/60">Subtotal</dt><dd>{formatMoney(order.subtotal)}</dd></div>
              {order.productSavings > 0 && <div className="flex justify-between text-emerald-700"><dt>Item discounts</dt><dd>−{formatMoney(order.productSavings)}</dd></div>}
              {order.couponDiscount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon {order.couponCode}</dt><dd>−{formatMoney(order.couponDiscount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink/60">Shipping</dt><dd>{order.shippingCost === 0 ? "FREE" : formatMoney(order.shippingCost)}</dd></div>
              {order.taxTotal > 0 && <div className="flex justify-between"><dt className="text-ink/60">Tax</dt><dd>{formatMoney(order.taxTotal)}</dd></div>}
              <div className="flex justify-between border-t border-ink pt-2 text-base font-bold"><dt>Grand Total</dt><dd>{formatMoney(order.total)}</dd></div>
              <p className="pt-1 text-xs text-ink/40">Payment method: {order.paymentMethod.replace("_", " ").toUpperCase()}</p>
            </dl>
          </div>

          {order.customerNote && (
            <div className="admin-card">
              <p className="admin-label">Customer Note</p>
              <p className="text-sm text-ink/70">{order.customerNote}</p>
            </div>
          )}
        </div>

        {/* admin actions */}
        <OrderAdminClient order={JSON.parse(JSON.stringify(order))} />
      </div>
    </div>
  );
}
