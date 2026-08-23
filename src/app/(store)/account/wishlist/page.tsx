import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import ProductCard from "@/components/store/ProductCard";
import { getActivePromotions } from "@/services/discount.service";
import { decorateProduct } from "@/services/product.service";
import { EmptyState } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AccountWishlistPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [items, promos] = await Promise.all([
    prisma.wishlistItem.findMany({
      where: { userId: session.id },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 2 },
            variants: { where: { isActive: true } },
            category: { select: { id: true, name: true, slug: true, parent: { select: { slug: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getActivePromotions(),
  ]);

  return (
    <div>
      <h2 className="font-serif text-2xl">Wishlist</h2>
      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nothing saved yet" hint="Tap the heart on any piece to keep it here." action={<Link href="/shop" className="btn-primary">Browse the Collection</Link>} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
          {items.map((i) => (
            <ProductCard key={i.id} product={decorateProduct(i.product as any, promos)} />
          ))}
        </div>
      )}
    </div>
  );
}
