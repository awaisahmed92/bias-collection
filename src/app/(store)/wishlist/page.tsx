"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useWishlist } from "@/stores/wishlist";
import { useSession } from "@/stores/session";
import ProductCard from "@/components/store/ProductCard";
import { EmptyState, Spinner } from "@/components/ui/primitives";

/** Guest wishlist — resolves local ids against the catalog API. */
export default function GuestWishlistPage() {
  const ids = useWishlist((s) => s.ids);
  const { user, loaded } = useSession();
  const [products, setProducts] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/products?limit=60");
      const json = await res.json();
      if (json.ok) setProducts(json.data.items.filter((p: any) => ids.includes(p.id)));
      else setProducts([]);
    })();
  }, [ids]);

  if (user && loaded) {
    // logged-in users use the account wishlist (server-synced)
    if (typeof window !== "undefined") window.location.href = "/account/wishlist";
    return null;
  }

  return (
    <div className="container-x py-10">
      <h1 className="font-serif text-4xl font-medium">Wishlist</h1>
      <p className="mt-2 text-sm text-ink/50">
        Saved on this device. <Link href="/login" className="font-semibold underline underline-offset-4">Login</Link> to sync across devices.
      </p>
      <div className="mt-8">
        {products === null ? (
          <div className="grid place-items-center py-20"><Spinner className="h-6 w-6" /></div>
        ) : products.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <EmptyState title="Your wishlist is empty" hint="Tap the heart on any piece to save it here." action={<Link href="/shop" className="btn-primary">Browse the Collection</Link>} />
        )}
      </div>
    </div>
  );
}
