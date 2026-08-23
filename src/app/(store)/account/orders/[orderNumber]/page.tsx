import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOrderByNumber } from "@/services/order.service";
import { formatMoney, formatDateTime, orderStatusColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetail({ params }: { params: { orderNumber: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const order = await getOrderByNumber(params.orderNumber);
  if (!order || order.userId !== session.id) notFound();

  return (
    <div>
      <Link href="/account/orders" className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/50 hover:text-ink">← All Orders</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">{order.orderNumber}</h2>
        <span className={`badge ${orderStatusColor(order.status)} !px-3 !py-1 !text-[11px]`}>{order.status}</span>
      </div>
      <p className="mt-1 text-sm text-ink/50">Placed {formatDateTime(order.placedAt)}</p>
      {order.trackingNumber && <p className="mt-1 text-sm">Tracking: <b>{order.trackingNumber}</b></p>}

      <div className="card mt-6 p-6">
        <h3 className="font-serif text-lg">Items</h3>
        <div className="mt-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 border-b border-line/60 py-3 last:border-0">
              <div className="h-16 w-12 shrink-0 overflow-hidden bg-sand">
                {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{item.productName}</p>
                {item.variantName && <p className="text-xs text-ink/50">{item.variantName}</p>}
                <p className="text-xs text-ink/50">Qty {item.quantity} × {formatMoney(item.finalPrice)}</p>
              </div>
              <span className="text-sm font-semibold">{formatMoney(item.lineTotal)}</span>
            </div>
          ))}
        </div>
        <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-ink/60">Subtotal</dt><dd>{formatMoney(order.subtotal)}</dd></div>
          {order.productSavings > 0 && <div className="flex justify-between text-emerald-700"><dt>Discounts</dt><dd>−{formatMoney(order.productSavings)}</dd></div>}
          {order.couponDiscount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon {order.couponCode}</dt><dd>−{formatMoney(order.couponDiscount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink/60">Shipping</dt><dd>{order.shippingCost === 0 ? "FREE" : formatMoney(order.shippingCost)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{formatMoney(order.total)}</dd></div>
        </dl>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-serif text-lg">Delivery Address</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            {order.shippingAddress}, {order.shippingArea}<br />
            {order.shippingCity}, {order.shippingCountry}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="font-serif text-lg">Timeline</h3>
          <ol className="mt-3 space-y-3">
            {order.history.map((h) => (
              <li key={h.id} className="flex gap-3 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-claydark" />
                <div>
                  <p className="font-semibold">{h.status}</p>
                  <p className="text-xs text-ink/50">{formatDateTime(h.createdAt)}{h.note ? ` — ${h.note}` : ""}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
