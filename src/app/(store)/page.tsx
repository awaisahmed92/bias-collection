import Link from "next/link";
import { activeSections, bannersForPosition, resolveSection } from "@/services/cms.service";
import SectionHeading from "@/components/store/SectionHeading";
import ProductGrid from "@/components/store/ProductGrid";
import NewsletterForm from "@/components/store/NewsletterForm";
import { IconArrowRight } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  men: "/images/cat-men.jpg",
  women: "/images/cat-women.jpg",
  accessories: "/images/cat-accessories.jpg",
  sale: "/images/cat-sale.jpg",
};

export default async function HomePage() {
  const [sections, heroBanners] = await Promise.all([activeSections(), bannersForPosition("HOME_HERO")]);
  const hero = heroBanners[0];

  return (
    <div className="fade-in">
      {sections.map(async (section) => {
        const cfg = safeParse(section.configJson);

        // ── HERO ──
        if (section.type === "HERO") {
          const image = hero?.desktopImage || section.image;
          const mobileImage = hero?.mobileImage || image;
          const title = section.title || hero?.title || "Discover Your Style";
          const eyebrow = section.subtitle || hero?.subtitle || "BIAS COLLECTION";
          const href = section.buttonLink || hero?.linkUrl || "/shop";
          const cta = section.buttonText || hero?.buttonText || "Shop Now";
          return (
            <section key={section.id} className="relative -mt-px">
              <div className="relative h-[78vh] min-h-[480px] w-full overflow-hidden bg-sand">
                {image && (
                  <>
                    <img src={image} alt={title} className="hidden h-full w-full object-cover sm:block" />
                    <img src={mobileImage || image} alt="" className="h-full w-full object-cover sm:hidden" />
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-ink/55 via-ink/25 to-transparent" />
                <div className="container-x absolute inset-0 flex items-center">
                  <div className="max-w-xl text-cream fade-up">
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-cream/80">{eyebrow}</p>
                    <h1 className="mt-4 font-serif text-5xl font-medium leading-[1.05] sm:text-7xl">{title}</h1>
                    <p className="mt-5 max-w-md text-sm leading-relaxed text-cream/80">
                      Considered clothing and accessories — premium fabrics, honest pricing, delivered across Pakistan.
                    </p>
                    <div className="mt-8 flex gap-3">
                      <Link href={href} className="btn bg-cream text-ink hover:bg-sand">{cta}</Link>
                      <Link href="/new-arrivals" className="btn border border-cream/70 text-cream hover:bg-cream hover:text-ink">
                        New In
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // ── CATEGORY_GRID ──
        if (section.type === "CATEGORY_GRID") {
          const { categories = [] } = await resolveSection(section);
          const cards = [
            ...categories,
            { id: "sale", name: "Sale", slug: "__sale", image: "/images/cat-sale.jpg" },
          ].slice(0, Number(cfg.maxItems) >= 4 ? Number(cfg.maxItems) : 4);
          return (
            <section key={section.id} className="container-x mt-16 sm:mt-24">
              <SectionHeading title={section.title} subtitle={section.subtitle} linkHref="/categories" linkText="All Categories" />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {cards.map((c: any) => {
                  const href = c.slug === "__sale" ? "/sale" : `/shop?category=${c.slug}`;
                  const img = c.image || CATEGORY_FALLBACK_IMAGES[c.slug];
                  return (
                    <Link key={c.id} href={href} className="group relative aspect-[3/4] overflow-hidden bg-sand">
                      {img && <img src={img} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
                        <span className="font-serif text-lg font-medium text-cream sm:text-xl">{c.name}</span>
                        <IconArrowRight className="h-5 w-5 text-cream transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        }

        // ── product rails ──
        if (section.type === "NEW_ARRIVALS" || section.type === "FEATURED_PRODUCTS" || section.type === "BEST_SELLERS") {
          const { products = [] } = await resolveSection(section);
          if (!products.length) return null;
          const tinted = section.type === "BEST_SELLERS";
          return (
            <section key={section.id} className={tinted ? "mt-16 sm:mt-24 bg-white py-14" : "container-x mt-16 sm:mt-24"}>
              <div className={tinted ? "container-x" : ""}>
                <SectionHeading
                  title={section.title}
                  subtitle={section.subtitle}
                  linkHref={section.type === "NEW_ARRIVALS" ? "/new-arrivals" : "/shop"}
                  linkText={section.buttonText || "View All"}
                />
                <ProductGrid products={products} />
              </div>
            </section>
          );
        }

        // ── PROMO_BANNER ──
        if (section.type === "PROMO_BANNER") {
          return (
            <section key={section.id} className="container-x mt-16 sm:mt-24">
              <div className="relative overflow-hidden bg-sand">
                {section.image && <img src={section.image} alt={section.title || ""} loading="lazy" className="h-[320px] w-full object-cover sm:h-[380px]" />}
                <div className="absolute inset-0 flex items-center bg-ink/35">
                  <div className="container-x">
                    <div className="max-w-lg text-cream">
                      <h2 className="font-serif text-4xl font-medium sm:text-5xl">{section.title}</h2>
                      {section.subtitle && <p className="mt-3 text-sm text-cream/85">{section.subtitle}</p>}
                      {section.buttonText && (
                        <Link href={section.buttonLink || "/shop"} className="btn mt-6 bg-cream text-ink hover:bg-sand">
                          {section.buttonText}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // ── SALE_BANNER ──
        if (section.type === "SALE_BANNER") {
          return (
            <section key={section.id} className="mt-16 bg-ink py-16 text-center text-cream sm:mt-24">
              <div className="container-x">
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-clay">Limited Time</p>
                <h2 className="mt-3 font-serif text-5xl font-medium tracking-wide sm:text-6xl">{section.title}</h2>
                <p className="mx-auto mt-4 max-w-lg text-sm text-cream/70">{section.subtitle}</p>
                <Link href={section.buttonLink || "/sale"} className="btn mt-8 bg-cream text-ink hover:bg-sand">
                  {section.buttonText || "Shop the Sale"}
                </Link>
              </div>
            </section>
          );
        }

        // ── NEWSLETTER ──
        if (section.type === "NEWSLETTER") {
          return (
            <section key={section.id} className="container-x mt-16 mb-4 sm:mt-24">
              <div className="border border-line bg-white px-6 py-14 text-center">
                <h2 className="font-serif text-3xl font-medium sm:text-4xl">{section.title}</h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">{section.subtitle}</p>
                <div className="mx-auto mt-7 max-w-md">
                  <NewsletterForm />
                </div>
              </div>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}

function safeParse(s: string) {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}
