"use client";
import { useEffect } from "react";
import { useSession } from "@/stores/session";
import { useCart } from "@/stores/cart";
import { useWishlist } from "@/stores/wishlist";

/** Bootstraps client session, cart count and wishlist on first load. */
export default function Providers({ children }: { children: React.ReactNode }) {
  const refreshSession = useSession((s) => s.refresh);
  const refreshCart = useCart((s) => s.refresh);
  const sessionUser = useSession((s) => s.user);
  const loaded = useSession((s) => s.loaded);
  const wishlistIds = useWishlist((s) => s.ids);
  const setWishlist = useWishlist((s) => s.setIds);

  useEffect(() => {
    refreshSession();
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync server wishlist into local store when logged in
  useEffect(() => {
    if (!loaded) return;
    if (!sessionUser) return;
    (async () => {
      try {
        // merge local ids server-side first
        if (wishlistIds.length) {
          await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ merge: true, productIds: wishlistIds }),
          });
        }
        const res = await fetch("/api/wishlist");
        const json = await res.json();
        if (json.ok) setWishlist(json.data.items.map((i: any) => i.productId));
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, sessionUser]);

  return <>{children}</>;
}
