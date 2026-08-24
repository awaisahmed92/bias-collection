import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts } from "@/services/product.service";
import { getActivePromotions } from "@/services/discount.service";
import PurchasePanel from "@/components/store/PurchasePanel";
import ProductGallery from "@/components/store/ProductGallery";
import ReviewForm from "@/components/store/ReviewForm";
import ProductGrid from "@/components/store/ProductGrid";
import { Stars } from "@/components/ui/primitives";
import { formatDate, formatMoney, safeJsonLd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription || undefined,
    openGraph: {
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.shortDescription || undefined,
      images: product.images[0]?.url ? [product.images[0].url] : undefined,
    },
    alternates: { canonical: `/product/${product.slug}` },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product || product.status !== "ACTIVE") notFound();
  const [related, promos] = await Promise.all([getRelatedProducts(product.id, product.categoryId), getActivePromotions()]);

  const price = product.price;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    description: product.shortDescription || product.description?.slice(0, 200),
    image: product.images.map((i: any) => i.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "PKR",
      price: price.final,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.rating
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount } }
      : {}),
  };

  return (
    <div className="container-x py-8">
      {/* breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink/50">
        <Link href="/" className="hover:text-ink">Home</Link> /
        <Link href={`/shop?category=${product.category.parent?.slug ?? product.category.slug}`} className="hover:text-ink">
          {product.category.parent?.name ?? product.category.name}
        </Link> /
        {product.category.parent && (
          <>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link> /{" "}
          </>
        )}
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery
          images={product.images}
          badges={
            <>
              {price.source === "FLASH" && <span className="badge-flash">Flash Sale</span>}
              {price.discountPercent > 0 && <span className="badge-sale">−{price.discountPercent}%</span>}
              {product.isNewArrival && <span className="badge-new">New</span>}
            </>
          }
        />

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-ink/40">{product.brand}</p>
          <h1 className="mt-2 font-serif text-4xl font-medium leading-tight">{product.name}</h1>
          {product.rating != null && (
            <div className="mt-2 flex items-center gap-2 text-sm text-ink/60">
              <Stars value={product.rating} />
              <span>{product.rating.toFixed(1)} · {product.reviewCount} review{product.reviewCount === 1 ? "" : "s"}</span>
            </div>
          )}
          {product.shortDescription && <p className="mt-4 text-[15px] leading-relaxed text-ink/70">{product.shortDescription}</p>}

          <PurchasePanel product={JSON.parse(JSON.stringify(product))} promos={JSON.parse(JSON.stringify(promos))} />
        </div>
      </div>

      {/* description + reviews */}
      <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-2xl font-medium">The Details</h2>
          <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink/70">{product.description || product.shortDescription}</p>
          {product.tags && (
            <div className="mt-5 flex flex-wrap gap-2">
              {product.tags.split(",").filter(Boolean).map((t: string) => (
                <Link key={t} href={`/shop?q=${encodeURIComponent(t.trim())}`} className="border border-line bg-white px-3 py-1 text-xs text-ink/60 hover:border-ink hover:text-ink">
                  #{t.trim()}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-serif text-2xl font-medium">Reviews {product.reviewCount > 0 && `(${product.reviewCount})`}</h2>
          <div className="mt-4 space-y-4">
            {product.reviews.length === 0 && <p className="text-sm text-ink/50">No reviews yet — be the first to share your experience.</p>}
            {product.reviews.map((r: any) => (
              <div key={r.id} className="border-b border-line pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{r.user.firstName} {r.user.lastName[0]}.</p>
                  <p className="text-xs text-ink/40">{formatDate(r.createdAt)}</p>
                </div>
                <Stars value={r.rating} />
                {r.comment && <p className="mt-1.5 text-sm text-ink/70">{r.comment}</p>}
              </div>
            ))}
          </div>
          <ReviewForm productId={product.id} />
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="mb-8 font-serif text-3xl font-medium">You May Also Like</h2>
          <ProductGrid products={related} />
        </div>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      {/* breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "/" },
              { "@type": "ListItem", position: 2, name: product.category.name, item: `/shop?category=${product.category.slug}` },
              { "@type": "ListItem", position: 3, name: product.name },
            ],
          }),
        }}
      />
    </div>
  );
}
