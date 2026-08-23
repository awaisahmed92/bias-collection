"use client";
import { create } from "zustand";

type CartState = {
  count: number;
  setCount: (n: number) => void;
  refresh: () => Promise<void>;
  add: (productId: string, variantId: string | null, quantity: number) => Promise<{ ok: boolean; error?: string }>;
};

export const useCart = create<CartState>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
  refresh: async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      const json = await res.json();
      set({ count: json?.data?.summary?.itemCount ?? 0 });
    } catch {}
  },
  add: async (productId, variantId, quantity) => {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId, quantity }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) return { ok: false, error: json.error || "Could not add to cart." };
      set({ count: json.data.summary.itemCount });
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error — please try again." };
    }
  },
}));
