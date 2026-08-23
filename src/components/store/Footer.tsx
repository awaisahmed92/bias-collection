import Link from "next/link";
import NewsletterForm from "./NewsletterForm";
import { IconShield, IconTruck, IconRefresh } from "@/components/ui/icons";

export default function Footer({ settings }: { settings: Record<string, string> }) {
  return (
    <footer className="mt-20">
      {/* service strip */}
      <div className="border-y border-line bg-white">
        <div className="container-x grid grid-cols-1 gap-6 py-10 sm:grid-cols-3">
          {[
            { icon: <IconTruck className="h-6 w-6" />, t: "Nationwide Delivery", s: "1–5 working days, tracked" },
            { icon: <IconShield className="h-6 w-6" />, t: "Secure Checkout", s: "COD, bank transfer & cards" },
            { icon: <IconRefresh className="h-6 w-6" />, t: "Easy Returns", s: "7-day exchange policy" },
          ].map((f) => (
            <div key={f.t} className="flex items-center gap-4">
              <span className="text-claydark">{f.icon}</span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{f.t}</p>
                <p className="text-sm text-ink/50">{f.s}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-ink text-cream/80">
        <div className="container-x grid grid-cols-2 gap-10 py-14 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <p className="font-serif text-2xl font-semibold tracking-[0.08em] text-cream">BIAS</p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.42em] text-cream/50">Collection</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/60">
              Considered clothing and accessories, designed in Karachi. Premium fabrics, honest pricing.
            </p>
          </div>
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-cream/40">Shop</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/shop" className="hover:text-cream">All Products</Link></li>
              <li><Link href="/new-arrivals" className="hover:text-cream">New Arrivals</Link></li>
              <li><Link href="/sale" className="hover:text-cream">Sale</Link></li>
              <li><Link href="/shop?category=men" className="hover:text-cream">Men</Link></li>
              <li><Link href="/shop?category=women" className="hover:text-cream">Women</Link></li>
              <li><Link href="/shop?category=accessories" className="hover:text-cream">Accessories</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-cream/40">Help</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/contact" className="hover:text-cream">Contact Us</Link></li>
              <li><Link href="/about" className="hover:text-cream">About Us</Link></li>
              <li><Link href="/account/orders" className="hover:text-cream">Track Order</Link></li>
              <li><Link href="/account" className="hover:text-cream">My Account</Link></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-cream/40">Stay in the loop</p>
            <NewsletterForm dark />
            <p className="mt-5 text-sm text-cream/60">{settings.storeEmail}</p>
            <p className="text-sm text-cream/60">{settings.storePhone}</p>
          </div>
        </div>
        <div className="border-t border-cream/10 py-5">
          <div className="container-x flex flex-col items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] text-cream/40 sm:flex-row">
            <p>© {new Date().getFullYear()} Bias Collection. All rights reserved.</p>
            <p>Crafted in Pakistan</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
