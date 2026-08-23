import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import WishlistButton from "./WishlistButton";
import QuickAddButton from "./QuickAddButton";
import { Stars } from "@/components/ui/primitives";

export default function ProductCard({ product, priority = false }: { product: any; priority?: boolean }) {
  const img = product.images?.[0]?.url;
  const img2 = product.images?.[1]?.url;
  const price = product.price;
  const outOfStock = !product.inStock;

  return (
    <div className="group relative flex flex-col bg-white">
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        <Link href={`/product/${product.slug}`} aria-label={product.name}>
          {img ? (
            <img
              src={img}
              alt={product.images?.[0]?.alt || product.name}
              loading={priority ? "eager" : "lazy"}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-[10px] uppercase tracking-[0.3em] text-ink/30">Bias</div>
          )}
          {img2 && (
            <img
              src={img2}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </Link>

        {/* badges */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {price.source === "FLASH" && <span className="badge-flash">Flash −{price.discountPercent}%</span>}
          {price.source !== "FLASH" && price.discountPercent > 0 && <span className="badge-sale">−{price.discountPercent}%</span>}
          {product.isNewArrival && <span className="badge-new">New</span>}
          {outOfStock && <span className="badge bg-ink/80 text-cream">Sold Out</span>}
        </div>

        <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
          <WishlistButton productId={product.id} />
        </div>

        {/* quick add */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0 max-lg:translate-y-0">
          <QuickAddButton product={product} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-1 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/40">
          {product.category?.parent?.name ?? product.category?.name}
        </p>
        <Link href={`/product/${product.slug}`} className="text-[15px] font-medium leading-snug hover:underline underline-offset-4">
          {product.name}
        </Link>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-[15px] font-semibold">{formatMoney(price.final)}</span>
          {price.final < price.base && (
            <span className="text-[13px] text-ink/40 line-through">{formatMoney(price.base)}</span>
          )}
        </div>
        {product.rating != null && (
          <div className="flex items-center gap-1.5 text-[11px] text-ink/50">
            <Stars value={product.rating} /> <span>{product.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
