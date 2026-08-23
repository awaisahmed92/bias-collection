export const metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <div className="container-x max-w-3xl py-16">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink/40">Our Story</p>
      <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">Bias Collection</h1>
      <div className="prose mt-8 space-y-5 text-[15px] leading-relaxed text-ink/70">
        <p>
          Bias Collection was born in Karachi with a simple conviction: premium clothing shouldn't demand a premium
          on your patience, wallet, or values. We design considered essentials — oxfords that hold their collar,
          tees with real weight, eastern wear with hand-finished detail — and deliver them across Pakistan without
          the middlemen.
        </p>
        <p>
          Every piece starts in our atelier, where we obsess over fabric hand-feel, stitch density and fit. We produce
          in small, deliberate batches to keep quality high and waste low. What you see on this store is what we wear
          ourselves.
        </p>
        <h2 className="!mt-10 font-serif text-2xl text-ink">What we promise</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Honest pricing — cost-based, never inflated for fake discounts.</li>
          <li>Premium fabrics — long-staple cottons, real silk, full-grain leather.</li>
          <li>Nationwide delivery in 1–5 days, tracked end to end.</li>
          <li>Cash on Delivery and 7-day easy exchanges.</li>
        </ul>
      </div>
    </div>
  );
}
