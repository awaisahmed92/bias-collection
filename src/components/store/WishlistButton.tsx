"use client";
import { useState } from "react";
import { useWishlist } from "@/stores/wishlist";
import { useSession } from "@/stores/session";
import { IconHeart } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export default function WishlistButton({ productId, className }: { productId: string; className?: string }) {
  const has = useWishlist((s) => s.ids.includes(productId));
  const toggle = useWishlist((s) => s.toggle);
  const user = useSession((s) => s.user);
  const [busy, setBusy] = useState(false);

  return (
    <button
      aria-label="Toggle wishlist"
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        setBusy(true);
        await toggle(productId, !!user);
        setBusy(false);
      }}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm transition-all hover:scale-110",
        has ? "text-rose-600" : "text-ink/70",
        className
      )}
    >
      <IconHeart filled={has} className="h-[18px] w-[18px]" />
    </button>
  );
}
