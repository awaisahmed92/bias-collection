"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/stores/session";
import { useCart } from "@/stores/cart";
import { cn, formatMoney } from "@/lib/utils";
import { Spinner } from "@/components/ui/primitives";

const STEPS = ["Information", "Shipping Address", "Delivery", "Payment", "Review"];
const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Hyderabad", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Other"];

type Quote = {
  itemCount: number;
  originalSubtotal: number;
  savings: number;
  subtotal: number;
  coupon: { code: string; discount: number; freeShipping: boolean; message: string } | null;
  freeShipping: boolean;
  methods: { id: string; name: string; description: string | null; minDays: number; maxDays: number; listPrice: number; cost: number }[];
  payments: { key: string; name: string; description: string | null; instructions: string | null }[];
  taxRate: number;
  afterCoupon: number;
};

export default function CheckoutClient() {
  const router = useRouter();
  const { user, loaded } = useSession();
  const setCartCount = useCart((s) => s.setCount);
  const [step, setStep] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    country: "Pakistan", city: "", area: "", address: "", postalCode: "",
    shippingMethodId: "", paymentMethod: "", couponCode: "", customerNote: "", saveAddress: true,
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // prefill from session + load cart lines
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, firstName: f.firstName || user.firstName, lastName: f.lastName || user.lastName, email: f.email || user.email }));
    const savedCoupon = localStorage.getItem("bias_coupon");
    if (savedCoupon) setForm((f) => ({ ...f, couponCode: f.couponCode || savedCoupon }));
    (async () => {
      const res = await fetch("/api/cart", { cache: "no-store" });
      const json = await res.json();
      setItems(json?.data?.summary?.items ?? []);
      if ((json?.data?.summary?.items ?? []).length === 0) router.replace("/cart");
    })();
    if (user) {
      fetch("/api/account/addresses").then(async (res) => {
        const json = await res.json();
        const def = json?.data?.addresses?.find((a: any) => a.isDefault) || json?.data?.addresses?.[0];
        if (def) setForm((f) => ({ ...f, city: f.city || def.city, area: f.area || def.area, address: f.address || def.address, postalCode: f.postalCode || def.postalCode || "", phone: f.phone || def.phone }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // refresh quote when city/coupon changes
  useEffect(() => {
    const t = setTimeout(async () => {
      const params = new URLSearchParams();
      if (form.city) params.set("city", form.city);
      if (form.couponCode) params.set("coupon", form.couponCode);
      const res = await fetch(`/api/checkout/options?${params}`);
      const json = await res.json();
      if (json.ok) {
        setQuote(json.data.quote);
        const qm = json.data.quote.methods[0];
        const qp = json.data.quote.payments[0];
        setForm((f) => ({
          ...f,
          shippingMethodId: qm && !json.data.quote.methods.some((m: any) => m.id === f.shippingMethodId) ? qm.id : f.shippingMethodId,
          paymentMethod: qp && !json.data.quote.payments.some((p: any) => p.key === f.paymentMethod) ? qp.key : f.paymentMethod,
        }));
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.city, form.couponCode]);

  const selectedMethod = quote?.methods.find((m) => m.id === form.shippingMethodId);
  const shippingCost = selectedMethod?.cost ?? 0;
  const tax = quote ? Math.round((quote.afterCoupon * quote.taxRate) / 100) : 0;
  const total = quote ? quote.afterCoupon + shippingCost + tax : 0;

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) return "Please enter your name.";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Please enter a valid email.";
      if (form.phone.trim().length < 7) return "Please enter a valid phone number.";
    }
    if (step === 1) {
      if (!form.city) return "Please select your city.";
      if (!form.area.trim()) return "Please enter your area / neighbourhood.";
      if (form.address.trim().length < 5) return "Please enter your street address.";
    }
    if (step === 2 && !form.shippingMethodId) return "Please choose a delivery method.";
    if (step === 3 && !form.paymentMethod) return "Please choose a payment method.";
    return null;
  };

  const next = () => {
    const err = validateStep();
    setError(err);
    if (!err) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const placeOrder = async () => {
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Could not place order.");
        setPlacing(false);
        return;
      }
      localStorage.removeItem("bias_coupon");
      setCartCount(0);
      router.push(`/order/${json.data.order.orderNumber}?new=1`);
    } catch {
      setError("Network error — please try again.");
      setPlacing(false);
    }
  };

  if (!loaded) return <div className="grid place-items-center py-24"><Spinner className="h-6 w-6" /></div>;

  const stepOk = (i: number) => i < step;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        {/* stepper */}
        <ol className="mb-8 flex flex-wrap items-center gap-y-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center">
              <button
                onClick={() => stepOk(i) && setStep(i)}
                className={cn(
                  "flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]",
                  i === step ? "text-ink" : stepOk(i) ? "text-claydark" : "text-ink/35"
                )}
              >
                <span className={cn("grid h-6 w-6 place-items-center rounded-full border text-[10px]", i === step ? "border-ink bg-ink text-cream" : stepOk(i) ? "border-claydark text-claydark" : "border-line")}>
                  {stepOk(i) ? "✓" : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && <span className="mx-3 h-px w-6 bg-line" />}
            </li>
          ))}
        </ol>

        {error && <p className="mb-4 border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}

        {/* STEP 1: info */}
        {step === 0 && (
          <section className="card p-6">
            <h2 className="font-serif text-xl">Contact Information</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="First Name"><input className="input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
              <Field label="Last Name"><input className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
              <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Phone (WhatsApp preferred)"><input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+92 3XX XXXXXXX" /></Field>
            </div>
            {!user && (
              <p className="mt-4 text-xs text-ink/50">
                Have an account? <Link href="/login?next=/checkout" className="font-semibold underline underline-offset-4">Login</Link> for faster checkout.
              </p>
            )}
            <StepActions onNext={next} />
          </section>
        )}

        {/* STEP 2: address */}
        {step === 1 && (
          <section className="card p-6">
            <h2 className="font-serif text-xl">Shipping Address</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Country"><input className="input" value={form.country} disabled /></Field>
              <Field label="City">
                <select className="select" value={form.city} onChange={(e) => set("city", e.target.value)}>
                  <option value="">Select city…</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Area / Neighbourhood"><input className="input" value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Clifton Block 4" /></Field>
              <Field label="Postal Code (optional)"><input className="input" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} /></Field>
              <div className="sm:col-span-2">
                <Field label="Street Address"><input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House, street, landmark" /></Field>
              </div>
              {user && (
                <label className="flex items-center gap-2 text-sm text-ink/70 sm:col-span-2">
                  <input type="checkbox" className="h-4 w-4 accent-ink" checked={form.saveAddress} onChange={(e) => set("saveAddress", e.target.checked)} />
                  Save this address to my account
                </label>
              )}
            </div>
            <StepActions onBack={() => setStep(0)} onNext={next} />
          </section>
        )}

        {/* STEP 3: delivery */}
        {step === 2 && (
          <section className="card p-6">
            <h2 className="font-serif text-xl">Delivery Method</h2>
            {!form.city && <p className="mt-3 text-sm text-amber-700">Select your city in the previous step to see accurate options.</p>}
            <div className="mt-5 space-y-3">
              {quote?.methods.map((m) => (
                <label key={m.id} className={cn("flex cursor-pointer items-center justify-between border p-4 transition-colors", form.shippingMethodId === m.id ? "border-ink bg-off" : "border-line hover:border-ink/40")}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="ship" checked={form.shippingMethodId === m.id} onChange={() => set("shippingMethodId", m.id)} className="h-4 w-4 accent-ink" />
                    <span>
                      <span className="block text-sm font-semibold">{m.name}</span>
                      <span className="block text-xs text-ink/50">{m.description} · {m.minDays}–{m.maxDays} working days</span>
                    </span>
                  </span>
                  <span className="text-sm font-semibold">{m.cost === 0 ? <span className="text-emerald-700">FREE</span> : formatMoney(m.cost)}</span>
                </label>
              ))}
              {quote && quote.methods.length === 0 && <p className="text-sm text-ink/50">No methods available yet.</p>}
            </div>
            <StepActions onBack={() => setStep(1)} onNext={next} />
          </section>
        )}

        {/* STEP 4: payment */}
        {step === 3 && (
          <section className="card p-6">
            <h2 className="font-serif text-xl">Payment Method</h2>
            <div className="mt-5 space-y-3">
              {quote?.payments.map((p) => (
                <label key={p.key} className={cn("block cursor-pointer border p-4 transition-colors", form.paymentMethod === p.key ? "border-ink bg-off" : "border-line hover:border-ink/40")}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="pay" checked={form.paymentMethod === p.key} onChange={() => set("paymentMethod", p.key)} className="h-4 w-4 accent-ink" />
                    <span className="text-sm font-semibold">{p.name}</span>
                  </span>
                  {p.description && <span className="mt-1 block pl-7 text-xs text-ink/50">{p.description}</span>}
                  {form.paymentMethod === p.key && p.instructions && (
                    <span className="mt-2 block whitespace-pre-line border border-amber-200 bg-amber-50 p-3 pl-3 text-xs text-amber-900">{p.instructions}</span>
                  )}
                </label>
              ))}
            </div>
            <StepActions onBack={() => setStep(2)} onNext={next} />
          </section>
        )}

        {/* STEP 5: review */}
        {step === 4 && quote && (
          <section className="card p-6">
            <h2 className="font-serif text-xl">Review Your Order</h2>
            <div className="mt-5 space-y-3 text-sm">
              <ReviewRow k="Contact" v={`${form.firstName} ${form.lastName} · ${form.email} · ${form.phone}`} />
              <ReviewRow k="Ship to" v={`${form.address}, ${form.area}, ${form.city}, ${form.country}`} />
              <ReviewRow k="Delivery" v={`${selectedMethod?.name ?? "—"} (${selectedMethod?.minDays}–${selectedMethod?.maxDays} days)`} />
              <ReviewRow k="Payment" v={quote.payments.find((p) => p.key === form.paymentMethod)?.name ?? "—"} />
              <div>
                <p className="label">Order Note (optional)</p>
                <textarea className="textarea" rows={2} value={form.customerNote} onChange={(e) => set("customerNote", e.target.value)} placeholder="Anything we should know?" />
              </div>
            </div>
            <div className="mt-5 border-t border-line pt-4">
              {items.map((l) => (
                <div key={l.id} className="flex items-center gap-3 border-b border-line/60 py-2.5 last:border-0">
                  <span className="text-xs font-bold text-ink/40">{l.quantity}×</span>
                  <span className="flex-1 text-sm">{l.name}{l.variantName ? ` — ${l.variantName}` : ""}</span>
                  <span className="text-sm font-semibold">{formatMoney(l.lineTotal)}</span>
                </div>
              ))}
            </div>
            <StepActions
              onBack={() => setStep(3)}
              onNext={placeOrder}
              nextLabel={placing ? "Placing Order…" : `Place Order — ${formatMoney(total)}`}
              busy={placing}
            />
          </section>
        )}
      </div>

      {/* side summary */}
      <aside className="h-fit border border-line bg-white p-6 lg:sticky lg:top-32">
        <h2 className="font-serif text-xl">Your Bag</h2>
        <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
          {items.map((l) => (
            <div key={l.id} className="flex items-center gap-3">
              <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-sand">
                {l.image && <img src={l.image} alt="" className="h-full w-full object-cover" />}
                <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center bg-ink px-1 text-[9px] font-bold text-cream">{l.quantity}</span>
              </div>
              <div className="flex-1 text-xs">
                <p className="font-semibold leading-tight">{l.name}</p>
                {l.variantName && <p className="text-ink/50">{l.variantName}</p>}
              </div>
              <span className="text-xs font-semibold">{formatMoney(l.lineTotal)}</span>
            </div>
          ))}
        </div>

        {/* coupon */}
        <div className="mt-4 border-t border-line pt-4">
          <label className="label">Coupon</label>
          <input
            className="input uppercase"
            placeholder="Code"
            value={form.couponCode}
            onChange={(e) => set("couponCode", e.target.value.toUpperCase())}
          />
          {quote?.coupon && <p className="mt-1.5 text-xs font-medium text-emerald-700">{quote.coupon.message}</p>}
        </div>

        {quote && (
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink/60">Subtotal</dt><dd>{formatMoney(quote.originalSubtotal)}</dd></div>
            {quote.savings > 0 && <div className="flex justify-between text-emerald-700"><dt>Discounts</dt><dd>−{formatMoney(quote.savings)}</dd></div>}
            {quote.coupon && quote.coupon.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon {quote.coupon.code}</dt><dd>−{formatMoney(quote.coupon.discount)}</dd></div>}
            <div className="flex justify-between">
              <dt className="text-ink/60">Shipping</dt>
              <dd>{quote.freeShipping || shippingCost === 0 ? <span className="font-semibold text-emerald-700">FREE</span> : formatMoney(shippingCost)}</dd>
            </div>
            {tax > 0 && <div className="flex justify-between"><dt className="text-ink/60">Tax ({quote.taxRate}%)</dt><dd>{formatMoney(tax)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-2.5 text-base font-bold">
              <dt>Total</dt><dd>{formatMoney(total)}</dd>
            </div>
          </dl>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50 pt-0.5">{k}</span>
      <span className="text-sm">{v}</span>
    </div>
  );
}

function StepActions({ onBack, onNext, nextLabel = "Continue", busy = false }: { onBack?: () => void; onNext: () => void; nextLabel?: string; busy?: boolean }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      {onBack ? <button onClick={onBack} className="btn-ghost">← Back</button> : <span />}
      <button onClick={onNext} disabled={busy} className="btn-primary">
        {busy ? <Spinner /> : nextLabel}
      </button>
    </div>
  );
}
