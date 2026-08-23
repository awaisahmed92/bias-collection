"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/stores/session";
import { useCart } from "@/stores/cart";
import { useWishlist } from "@/stores/wishlist";
import { IconBag, IconHeart, IconMenu, IconSearch, IconUser, IconX } from "@/components/ui/icons";
import { cn, formatMoney } from "@/lib/utils";

type Cat = { id: string; name: string; slug: string; children: { name: string; slug: string }[] };

export default function Header({
  categories,
  initialUser,
  announcement,
}: {
  categories: Cat[];
  initialUser: { firstName: string; lastName: string; email: string; role: string } | null;
  announcement?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, logout } = useSession();
  const cartCount = useCart((s) => s.count);
  const wishlistCount = useWishlist((s) => s.ids.length);
  const refreshCart = useCart((s) => s.refresh);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialUser) setUser(initialUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setDrawerOpen(false);
    setSearchOpen(false);
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) return setSuggestions([]);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (json.ok) setSuggestions(json.data.suggestions);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setSearchOpen(false);
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  const NAV = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/new-arrivals", label: "New Arrivals" },
    { href: "/sale", label: "Sale", accent: true },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-40">
      {announcement ? (
        <div className="bg-ink px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/90">
          {announcement}
        </div>
      ) : null}

      <div className="border-b border-line bg-cream/95 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          {/* left: mobile menu + logo */}
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
              <IconMenu className="h-6 w-6" />
            </button>
            <Link href="/" className="flex flex-col leading-none">
              <span className="font-serif text-[22px] font-semibold tracking-[0.08em]">BIAS</span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.42em] text-ink/60">Collection</span>
            </Link>
          </div>

          {/* center nav */}
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cn("nav-link", n.accent && "text-rose-700 hover:text-rose-800 after:bg-rose-700")}>
                {n.label}
              </Link>
            ))}
            <div className="group relative">
              <button className="nav-link flex items-center gap-1">Categories</button>
              <div className="invisible absolute left-1/2 top-full z-50 w-[480px] -translate-x-1/2 pt-4 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                <div className="grid grid-cols-3 gap-6 border border-line bg-cream p-6 shadow-xl">
                  {categories.map((c) => (
                    <div key={c.id}>
                      <Link href={`/shop?category=${c.slug}`} className="text-[11px] font-bold uppercase tracking-[0.18em]">
                        {c.name}
                      </Link>
                      <ul className="mt-2 space-y-1.5">
                        {c.children.map((s) => (
                          <li key={s.slug}>
                            <Link href={`/shop?category=${s.slug}`} className="text-[13px] text-ink/60 hover:text-ink">
                              {s.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* right icons */}
          <div className="flex items-center gap-4 sm:gap-5">
            <button onClick={() => setSearchOpen((v) => !v)} aria-label="Search">
              <IconSearch className="h-5 w-5" />
            </button>
            <Link href={user ? "/account/wishlist" : "/wishlist"} className="relative" aria-label="Wishlist">
              <IconHeart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[9px] font-bold text-cream">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link href="/cart" className="relative" aria-label="Shopping cart">
              <IconBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[9px] font-bold text-cream">
                  {cartCount}
                </span>
              )}
            </Link>
            <div className="relative" ref={accountRef}>
              <button onClick={() => setAccountOpen((v) => !v)} aria-label="Account">
                <IconUser className="h-5 w-5" />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full z-50 mt-3 w-52 border border-line bg-cream p-2 shadow-xl">
                  {user ? (
                    <>
                      <div className="border-b border-line px-3 py-2">
                        <p className="text-sm font-semibold">{user.firstName} {user.lastName}</p>
                        <p className="truncate text-xs text-ink/50">{user.email}</p>
                      </div>
                      <MenuLink href="/account" label="My Account" />
                      <MenuLink href="/account/orders" label="Orders" />
                      <MenuLink href="/account/wishlist" label="Wishlist" />
                      {user.role !== "customer" && <MenuLink href="/admin" label="Admin Panel" accent />}
                      <button
                        className="mt-1 w-full px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-[0.14em] text-rose-700 hover:bg-sand"
                        onClick={async () => { await logout(); setAccountOpen(false); router.push("/"); }}
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <MenuLink href="/login" label="Login" />
                      <MenuLink href="/register" label="Create Account" />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* search bar */}
        {searchOpen && (
          <div className="border-t border-line bg-cream">
            <div className="container-x relative py-4">
              <form onSubmit={submitSearch} className="flex gap-3">
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search shirts, kurtas, accessories…"
                  className="input !border-ink/20 !bg-white"
                />
                <button type="submit" className="btn-primary btn-sm">Search</button>
              </form>
              {suggestions.length > 0 && (
                <div className="absolute inset-x-4 top-full z-50 border border-line bg-white shadow-xl sm:inset-x-6 lg:inset-x-8">
                  {suggestions.map((s) => (
                    <Link
                      key={s.id}
                      href={`/product/${s.slug}`}
                      className="flex items-center gap-3 border-b border-line/60 px-4 py-2.5 hover:bg-off"
                      onClick={() => setSearchOpen(false)}
                    >
                      {s.image && <img src={s.image} alt="" className="h-10 w-10 object-cover" />}
                      <span className="flex-1 text-sm">{s.name}</span>
                      <span className="text-sm font-semibold">{formatMoney(s.price.final)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-cream p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-serif text-xl font-semibold tracking-[0.08em]">BIAS</span>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu"><IconX className="h-6 w-6" /></button>
            </div>
            <form onSubmit={submitSearch} className="mb-6 flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="input" />
              <button className="btn-primary btn-sm" type="submit">Go</button>
            </form>
            <nav className="space-y-4">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={cn("block text-sm font-semibold uppercase tracking-[0.18em]", n.accent && "text-rose-700")}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-8 border-t border-line pt-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">Categories</p>
              {categories.map((c) => (
                <div key={c.id} className="mb-4">
                  <Link href={`/shop?category=${c.slug}`} className="text-sm font-semibold">{c.name}</Link>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    {c.children.map((s) => (
                      <Link key={s.slug} href={`/shop?category=${s.slug}`} className="text-[13px] text-ink/60">
                        {s.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 border-t border-line pt-6">
              {user ? (
                <>
                  <Link href="/account" className="block text-sm font-semibold uppercase tracking-[0.14em]">My Account</Link>
                  {user.role !== "customer" && (
                    <Link href="/admin" className="mt-3 block text-sm font-semibold uppercase tracking-[0.14em] text-claydark">Admin Panel</Link>
                  )}
                  <button onClick={async () => { await logout(); setDrawerOpen(false); router.push("/"); }} className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-rose-700">
                    Logout
                  </button>
                </>
              ) : (
                <Link href="/login" className="btn-primary w-full">Login / Register</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ href, label, accent }: { href: string; label: string; accent?: boolean }) {
  return (
    <Link href={href} className={cn("block px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] hover:bg-sand", accent && "text-claydark")}>
      {label}
    </Link>
  );
}
