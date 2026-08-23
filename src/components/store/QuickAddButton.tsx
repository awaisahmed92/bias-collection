"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/stores/cart";

export default function QuickAddButton({ product }: { product: any }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [state, setState] = useState<"idle" | "busy" | "added" | "error">("idle");

  const base = product.inStock
    ? "block w-full bg-ink/90 py-3 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-cream backdrop-blur transition-colors hover:bg-claydark"
    : "block w-full cursor-not-allowed bg-ink/40 py-3 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-cream/80";

  if (!product.inStock) return <span className={base}>Sold Out</span>;

  return (
    <button
      className={state === "added" ? base + " !bg-emerald-700" : state === "error" ? base + " !bg-rose-700" : base}
      disabled={state === "busy"}
      onClick={async () => {
        if (product.hasVariants) {
          router.push(`/product/${product.slug}`);
          return;
        }
        setState("busy");
        const res = await add(product.id, null, 1);
        setState(res.ok ? "added" : "error");
        if (!res.ok && res.error) alert(res.error);
        setTimeout(() => setState("idle"), 1400);
      }}
    >
      {state === "busy" ? "Adding…" : state === "added" ? "Added ✓" : state === "error" ? "Try Again" : product.hasVariants ? "Select Options" : "Add to Cart"}
    </button>
  );
}
