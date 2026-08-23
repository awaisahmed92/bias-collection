"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/stores/session";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Dashboard" },
  { href: "/account/orders", label: "My Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Saved Addresses" },
  { href: "/account/settings", label: "Settings" },
];

export default function AccountNav({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useSession((s) => s.logout);
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "whitespace-nowrap border-l-2 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors",
            pathname === l.href ? "border-ink bg-white text-ink" : "border-transparent text-ink/50 hover:text-ink"
          )}
        >
          {l.label}
        </Link>
      ))}
      {role !== "customer" && (
        <Link href="/admin" className="whitespace-nowrap border-l-2 border-transparent px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-claydark">
          Admin Panel →
        </Link>
      )}
      <button
        onClick={async () => { await logout(); router.push("/"); router.refresh(); }}
        className="whitespace-nowrap border-l-2 border-transparent px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.14em] text-rose-700"
      >
        Logout
      </button>
    </nav>
  );
}
