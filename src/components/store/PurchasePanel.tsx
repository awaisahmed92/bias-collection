"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/stores/cart";
import { formatMoney, cn } from "@/lib/utils";
import { priceForProduct, type ActivePromotion } from "@/services/discount.service";
import WishlistButton from "./WishlistButton";

export default function PurchasePanel({ product, promos }: { product: any; promos: ActivePromotion[] }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const activeVariants = useMemo(() => product.variants.filter((v: any) => v.isActive), [product.variants]);
  const hasVariants = activeVariants.length > 0;

  const sizes = useMemo(() => [...new Set(activeVariants.map((v: any) => v.size).filter(Boolean))] as string[], [activeVariants]);
  const colors = useMemo(() => [...new Set(activeVariants.map((v: any) => v.color).filter(Boolean))] as string[], [activeVariants]);

  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0] : null);
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<"idle" | "busy" | "added">("idle");
  const [error, setError] = useState<string | null>(null);

  const variant = useMemo(() => {
    if (!hasVariants) return null;
    return activeVariants.find((v: any) => (sizes.length ? v.size === size : true) && (colors.length ? v.color === color : true)) ?? null;
  }, [activeVariants, size, color, hasVariants, sizes.length, colors.length]);

  const selectionComplete = !hasVariants || (sizes.every(() => !!size) && colors.every(() => !!color) && !!variant);
  const price = priceForProduct(product, promos, variant);
  const availability = variant ? Math.max(0, variant.stock - variant.reservedStock) : Math.max(0, product.stock - product.reservedStock);
  const inStock = product.allowBackorder || (selectionComplete && availability > 0) || (!hasVariants && availability > 0);

  const tryAdd = async () => {
    setError(null);
    if (hasVariants && !variant) {
      setError("Please select " + [sizes.length && !size ? "a size" : null, colors.length && !color ? "a color" : null].filter(Boolean).join(" and ") + ".");
      return;
    }
    setState("busy");
    const res = await add(product.id, variant?.id ?? null, qty);
    if (!res.ok) {
      setError(res.error || "Could not add to cart.");
      setState("idle");
      return;
    }
    setState("added");
    setTimeout(() => setState("idle"), 1600);
  };

  return (
    <div className="mt-6">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold">{formatMoney(price.final)}</span>
        {price.final < price.base && (
          <>
            <span className="text-base text-ink/40 line-through">{formatMoney(price.base)}</span>
            <span className="badge-sale">Save {price.discountPercent}%</span>
          </>
        )}
      </div>
      {price.label && price.source !== "NONE" && price.source !== "SALE_PRICE" && (
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-claydark">{price.label}</p>
      )}

      {sizes.length > 0 && (
        <div className="mt-6">
          <p className="label">Size {size && <span className="ml-1 text-ink">— {size}</span>}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const anyStock = activeVariants.some((v: any) => v.size === s && (!colors.length || !color || v.color === color) && (product.allowBackorder || v.stock - v.reservedStock > 0));
              return (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={cn(
                    "min-w-11 border px-3.5 py-2.5 text-sm font-semibold transition-colors",
                    size === s ? "border-ink bg-ink text-cream" : anyStock ? "border-line bg-white hover:border-ink" : "border-line bg-white text-ink/30 line-through"
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div className="mt-5">
          <p className="label">Color {color && <span className="ml-1 text-ink">— {color}</span>}</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "border px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  color === c ? "border-ink bg-ink text-cream" : "border-line bg-white hover:border-ink"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 text-sm">
        {selectionComplete ? (
          inStock ? (
            availability <= 5 && !product.allowBackorder ? (
              <span className="font-semibold text-amber-700">Only {availability} left — order soon</span>
            ) : (
              <span className="font-semibold text-emerald-700">In stock</span>
            )
          ) : (
            <span className="font-semibold text-rose-700">Out of stock</span>
          )
        ) : (
          <span className="text-ink/50">Select an option to check availability</span>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}

      <div className="mt-6 flex items-stretch gap-3">
        <div className="flex items-center border border-line bg-white">
          <button className="px-3.5 py-3" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
          <span className="w-8 text-center text-sm font-semibold">{qty}</span>
          <button className="px-3.5 py-3" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Increase quantity">+</button>
        </div>
        <button
          onClick={tryAdd}
          disabled={state === "busy" || (selectionComplete && !inStock && !product.allowBackorder)}
          className={cn("btn-primary flex-1", state === "added" && "!bg-emerald-700")}
        >
          {state === "busy" ? "Adding…" : state === "added" ? "Added to Bag ✓" : selectionComplete && !inStock && !product.allowBackorder ? "Out of Stock" : "Add to Bag"}
        </button>
        <WishlistButton productId={product.id} className="!h-auto !w-12 !rounded-none border border-line !bg-white shadow-none" />
      </div>

      <button
        onClick={async () => {
          await tryAdd();
          useCart.getState().count && router.push("/checkout");
        }}
        className="btn-outline mt-3 w-full"
        disabled={selectionComplete && !inStock && !product.allowBackorder}
      >
        Buy It Now
      </button>

      <div className="mt-6 space-y-2 border-t border-line pt-5 text-[13px] text-ink/60">
        <p>SKU: {variant?.sku ?? product.sku}</p>
        <p>Free shipping on orders above Rs. 5,000</p>
        <p>7-day easy exchange · Cash on Delivery available</p>
      </div>
    </div>
  );
}
