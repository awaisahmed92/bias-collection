import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByNumber } from "@/services/order.service";
import { formatMoney, formatDateTime, paymentStatusColor } from "@/lib/utils";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order Confirmation", robots: { index: false } };

const FLOW = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"];

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: { orderNumber: string };
  searchParams: { new?: string };
}) {
  const order = await getOrderByNumber(params.orderNumber);
  if (!order) notFound();

  let instructions: string | null = null;
  if (order.paymentMethod === "bank_transfer" && order.paymentStatus === "PENDING") {
    const cfg = await prisma.paymentMethodConfig.findUnique({ where: { key: "bank_transfer" } });
    instructions = cfg?.instructions ?? null;
  }

  const flowIndex = order.status === "CANCELLED" ? -1 : FLOW.indexOf(order.status);

  return (
    <div className="container-x max-w-3xl py-12">
      {searchParams.new ? (
        <div className="mb-8 border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-serif text-3xl text-emerald-900">Thank you, {order.customerFirstName}! 🎉</p>
          <p className="mt-2 text-sm text-emerald-800">
            Your order <span className="font-bold">{order.orderNumber}</span> is confirmed. We've sent the details to {order.email}.
          </p>
        </div>
      ) : (
        <h1 className="mb-8 font-serif text-4xl font-medium">Order {order.orderNumber}</h1>
      )}

      {/* status tracker */}
      {order.status !== "CANCELLED" ? (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            {FLOW.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col items-center">
                <span className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] font-bold ${i <= flowIndex ? "border-ink bg-ink text-cream" : "border-line text-ink/40"}`}>
                  {i < flowIndex ? "✓" : i + 1}
                </span>
                <span className={`mt-1.5 hidden text-[9px] font-bold uppercase tracking-[0.1em] sm:block ${i <= flowIndex ? "text-ink" : "text-ink/40"}`}>{s}</span>
              </div>
            ))}
          </div>
          {order.trackingNumber && (
            <p className="mt-4 text-center text-sm">Tracking number: <span className="font-bold">{order.trackingNumber}</span></p>
          )}
        </div>
      ) : (
        <div className="card border-rose-200 bg-rose-50 p-6 text-center text-rose-800">This order was cancelled.</div>
      )}

      {instructions && (
        <div className="mt-6 border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="mb-1 font-bold uppercase tracking-[0.14em] text-[11px]">Complete your bank transfer</p>
          <p className="whitespace-pre-line">{instructions}</p>
          <p className="mt-2">Reference: <span className="font-bold">{order.orderNumber}</span></p>
        </div>
      )}

      {/* items */}
      <div className="card mt-6 p-6">
        <h2 className="font-serif text-xl">Items</h2>
        <div className="mt-4">
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
          <div className="flex justify-between"><dt className="text-ink/60">Shipping ({order.shippingMethodName})</dt><dd>{order.shippingCost === 0 ? "FREE" : formatMoney(order.shippingCost)}</dd></div>
          {order.taxTotal > 0 && <div className="flex justify-between"><dt className="text-ink/60">Tax</dt><dd>{formatMoney(order.taxTotal)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{formatMoney(order.total)}</dd></div>
          <div className="flex justify-between pt-1 text-xs">
            <dt className="text-ink/60">Payment ({order.paymentMethod.replace("_", " ")})</dt>
            <dd><span className={`badge ${paymentStatusColor(order.paymentStatus)}`}>{order.paymentStatus}</span></dd>
          </div>
        </dl>
      </div>

      {/* address */}
      <div className="card mt-6 p-6">
        <h2 className="font-serif text-xl">Delivery Details</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          {order.customerFirstName} {order.customerLastName}<br />
          {order.shippingAddress}, {order.shippingArea}<br />
          {order.shippingCity}, {order.shippingCountry} {order.shippingPostalCode ?? ""}<br />
          {order.phone}
        </p>
        <p className="mt-2 text-xs text-ink/40">Placed {formatDateTime(order.placedAt)}</p>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/shop" className="btn-outline">Continue Shopping</Link>
        <Link href="/account/orders" className="btn-primary">Track in My Account</Link>
      </div>
    </div>
  );
}
