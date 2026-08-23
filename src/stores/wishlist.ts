"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Wishlist ids are persisted locally (guests) and mirrored server-side for
 * logged-in users. After login, ids are merged into the account (see login form).
 */
type WishlistState = {
  ids: string[];
  toggle: (productId: string, loggedIn: boolean) => Promise<boolean>;
  has: (productId: string) => boolean;
  setIds: (ids: string[]) => void;
  clearLocal: () => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      has: (id) => get().ids.includes(id),
      setIds: (ids) => set({ ids }),
      clearLocal: () => set({ ids: [] }),
      toggle: async (productId, loggedIn) => {
        const had = get().ids.includes(productId);
        set({ ids: had ? get().ids.filter((i) => i !== productId) : [...get().ids, productId] });
        if (loggedIn) {
          try {
            await fetch("/api/wishlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId }),
            });
          } catch {}
        }
        return !had;
      },
    }),
    { name: "bias-wishlist" }
  )
);
