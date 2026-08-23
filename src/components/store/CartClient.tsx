"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/stores/cart";
import { formatMoney } from "@/lib/utils";
import { IconTrash, IconX } from "@/components/ui/icons";
import { EmptyState, Spinner } from "@/components/ui/primitives";

type Summary = {
  items: any[];
  itemCount: number;
  subtotal: number;
  originalSubtotal: number;
  savings: number;
  freeShippingThreshold: number | null;
};

export default function CartClient() {
  const setCount = useCart((s) => s.setCount);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState<{ discount: number; message: string } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      const json = await res.json();
      setSummary(json.data.summary);
      setCount(json.data.summary.itemCount);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutate = async (fn: () => Promise<Response>) => {
    setError(null);
    const res = await fn();
    const json = await res.json();
    if (json.ok) {
      setSummary(json.data.summary);
      setCount(json.data.summary.itemCount);
    } else setError(json.error);
  };

  const applyCoupon = async () => {
    setCouponError(null);
    setCouponState(null);
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: coupon }),
    });
    const json = await res.json();
    if (json.ok) {
      setCouponState({ discount: json.data.result.discount, message: json.data.result.message });
      localStorage.setItem("bias_coupon", coupon.toUpperCase());
    } else setCouponError(json.error);
  };

  if (loading)
    return (
      <div className="grid place-items-center py-24">
        <Spinner className="h-6 w-6" />
      </div>
    );

  if (!summary || summary.items.length === 0)
    return (
      <EmptyState
        title="Your bag is empty"
        hint="Beautiful things await in the collection."
        action={<Link href="/shop" className="btn-primary">Continue Shopping</Link>}
      />
    );

  const threshold = summary.freeShippingThreshold ?? 5000;
  const afterCoupon = Math.max(0, summary.subtotal - (couponState?.discount ?? 0));
  const progress = Math.min(100, Math.round((afterCoupon / threshold) * 100));

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      {/* lines */}
      <div>
        {error && <p className="mb-4 border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
        <div className="hidden grid-cols-[1fr_120px_120px_40px] gap-4 border-b border-line pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50 sm:grid">
          <span>Product</span><span className="text-center">Quantity</span><span className="text-right">Total</span><span />
        </div>
        {summary.items.map((line) => (
          <div key={line.id} className="grid grid-cols-[88px_1fr] gap-4 border-b border-line py-5 sm:grid-cols-[1fr_120px_120px_40px] sm:items-center">
            <div className="flex gap-4 sm:contents">
              <Link href={`/product/${line.slug}`} className="block aspect-[4/5] w-[88px] shrink-0 overflow-hidden bg-sand">
                {line.image && <img src={line.image} alt={line.name} className="h-full w-full object-cover" />}
              </Link>
              <div className="sm:hidden">
                <Link href={`/product/${line.slug}`} className="text-sm font-semibold leading-snug">{line.name}</Link>
                {line.variantName && <p className="mt-0.5 text-xs text-ink/50">{line.variantName}</p>}
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{formatMoney(line.unitFinal)}</span>
                  {line.unitFinal < line.unitBase && <span className="text-xs text-ink/40 line-through">{formatMoney(line.unitBase)}</span>}
                </div>
                <LineControls line={line} mutate={mutate} />
              </div>
            </div>
            <div className="hidden sm:block">
              <Link href={`/product/${line.slug}`} className="text-[15px] font-semibold hover:underline underline-offset-4">{line.name}</Link>
              {line.variantName && <p className="mt-0.5 text-xs text-ink/50">{line.variantName}</p>}
              <div className="mt-1 flex items-baseline gap-2 text-sm">
                <span className="font-semibold">{formatMoney(line.unitFinal)}</span>
                {line.unitFinal < line.unitBase && <span className="text-xs text-ink/40 line-through">{formatMoney(line.unitBase)}</span>}
              </div>
              {line.unitLabel && <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-claydark">{line.unitLabel}</p>}
              {line.freeUnits > 0 && <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">+{line.freeUnits} free (Buy X Get Y)</p>}
              {!line.inStock && <p className="mt-0.5 text-[11px] font-bold text-rose-600">Only {line.available} left — reduce quantity</p>}
            </div>
            <div className="hidden sm:flex sm:items-center sm:justify-center">
              <LineControls line={line} mutate={mutate} />
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-[15px] font-semibold">{formatMoney(line.lineTotal)}</p>
            </div>
            <button
              className="hidden justify-self-end text-ink/40 hover:text-rose-600 sm:block"
              aria-label="Remove item"
              onClick={() => mutate(() => fetch(`/api/cart?itemId=${line.id}`, { method: "DELETE" }))}
            >
              <IconTrash className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      {/* summary */}
      <aside className="h-fit border border-line bg-white p-6 lg:sticky lg:top-32">
        <h2 className="font-serif text-xl font-medium">Order Summary</h2>

        {/* free shipping progress */}
        <div className="mt-4">
          <p className="text-xs text-ink/60">
            {afterCoupon >= threshold ? (
              <span className="font-semibold text-emerald-700">You've unlocked FREE shipping 🎉</span>
            ) : (
              <>Add <span className="font-semibold">{formatMoney(threshold - afterCoupon)}</span> more for free shipping</>
            )}
          </p>
          <div className="mt-2 h-1.5 w-full bg-sand">
            <div className="h-full bg-claydark transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <dl className="mt-5 space-y-2.5 text-sm">
          <div className="flex justify-between"><dt className="text-ink/60">Subtotal</dt><dd className="font-medium">{formatMoney(summary.originalSubtotal)}</dd></div>
          {summary.savings > 0 && (
            <div className="flex justify-between text-emerald-700"><dt>Item discounts</dt><dd>−{formatMoney(summary.savings)}</dd></div>
          )}
          {couponState && couponState.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>Coupon ({coupon.toUpperCase()}) <button onClick={() => { setCouponState(null); setCoupon(""); localStorage.removeItem("bias_coupon"); }} className="ml-1 text-rose-600" aria-label="Remove coupon"><IconX className="inline h-3 w-3" /></button></dt>
              <dd>−{formatMoney(couponState.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <dt>Total before shipping</dt>
            <dd>{formatMoney(afterCoupon)}</dd>
          </div>
          <p className="text-xs text-ink/40">Shipping calculated at checkout.</p>
        </dl>

        {/* coupon */}
        <div className="mt-5">
          <label className="label">Coupon code</label>
          <div className="flex gap-2">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="BIAS20" className="input uppercase" />
            <button onClick={applyCoupon} className="btn-outline btn-sm">Apply</button>
          </div>
          {couponState && <p className="mt-1.5 text-xs font-medium text-emerald-700">{couponState.message}</p>}
          {couponError && <p className="mt-1.5 text-xs font-medium text-rose-600">{couponError}</p>}
          <p className="mt-2 text-[11px] text-ink/40">Try: BIAS20 · WELCOME10 · FREESHIP</p>
        </div>

        <Link href="/checkout" className="btn-primary mt-6 w-full">Proceed to Checkout</Link>
        <Link href="/shop" className="btn-ghost mt-1 w-full">Continue Shopping</Link>
      </aside>
    </div>
  );
}

function LineControls({ line, mutate }: { line: any; mutate: (fn: () => Promise<Response>) => Promise<void> }) {
  return (
    <div className="mt-2 inline-flex items-center border border-line bg-white sm:mt-0">
      <button
        className="px-3 py-1.5 text-lg leading-none"
        aria-label="Decrease"
        onClick={() => mutate(() => fetch("/api/cart", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: line.id, quantity: line.quantity - 1 }) }))}
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-semibold">{line.quantity}</span>
      <button
        className="px-3 py-1.5 text-lg leading-none"
        aria-label="Increase"
        onClick={() => mutate(() => fetch("/api/cart", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: line.id, quantity: line.quantity + 1 }) }))}
      >
        +
      </button>
    </div>
  );
}
