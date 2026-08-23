import Link from "next/link";
import { listCategories } from "@/services/category.service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await listCategories(false);
  return (
    <div className="container-x py-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink/40">Explore</p>
      <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">Categories</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-3">
        {categories.map((c) => (
          <div key={c.id}>
            <Link href={`/shop?category=${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-sand">
              {c.image && <img src={c.image} alt={c.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
              <div className="absolute bottom-0 p-5">
                <p className="font-serif text-2xl text-cream">{c.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-cream/70">{c._count.products + c.children.reduce((s: number, ch: any) => s + ch._count.products, 0)} pieces</p>
              </div>
            </Link>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.children.map((s: any) => (
                <Link key={s.id} href={`/shop?category=${s.slug}`} className="border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-ink hover:text-ink">
                  {s.name} ({s._count.products})
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
