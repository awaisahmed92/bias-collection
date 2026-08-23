"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/stores/session";
import { cn, initials } from "@/lib/utils";
import { IconBell, IconMenu, IconX } from "@/components/ui/icons";

type NavItem = { href: string; label: string; perm?: string; group: string };

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", group: "Overview" },
  { href: "/admin/products", label: "Products", perm: "products.view", group: "Catalog" },
  { href: "/admin/categories", label: "Categories", perm: "categories.manage", group: "Catalog" },
  { href: "/admin/inventory", label: "Inventory", perm: "inventory.view", group: "Catalog" },
  { href: "/admin/orders", label: "Orders", perm: "orders.view", group: "Sales" },
  { href: "/admin/customers", label: "Customers", perm: "customers.view", group: "Sales" },
  { href: "/admin/promotions", label: "Sales & Promotions", perm: "promotions.manage", group: "Marketing" },
  { href: "/admin/coupons", label: "Coupons", perm: "coupons.manage", group: "Marketing" },
  { href: "/admin/homepage", label: "Homepage Builder", perm: "cms.manage", group: "Marketing" },
  { href: "/admin/banners", label: "Banners", perm: "cms.manage", group: "Marketing" },
  { href: "/admin/reviews", label: "Reviews", perm: "reviews.manage", group: "Marketing" },
  { href: "/admin/reports", label: "Reports & Analytics", perm: "reports.view", group: "Insights" },
  { href: "/admin/shipping", label: "Shipping", perm: "shipping.manage", group: "Configuration" },
  { href: "/admin/payments", label: "Payment Methods", perm: "payments.manage", group: "Configuration" },
  { href: "/admin/users", label: "Users & Roles", perm: "users.manage", group: "Configuration" },
  { href: "/admin/settings", label: "Settings", perm: "settings.manage", group: "Configuration" },
  { href: "/admin/audit", label: "Audit Log", perm: "audit.view", group: "Configuration" },
];

export default function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string; permissions: string[] };
  notifications?: any[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const logoutSession = useSession((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  const can = (perm?: string) => !perm || user.permissions.includes("*") || user.permissions.includes(perm);
  const groups = [...new Set(NAV.map((n) => n.group))];

  const sidebar = (
    <div className="flex h-full flex-col bg-ink text-cream/80">
      <Link href="/admin" className="flex items-baseline gap-2 border-b border-cream/10 px-5 py-5">
        <span className="font-serif text-xl font-semibold tracking-[0.08em] text-cream">BIAS</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-clay">Admin</span>
      </Link>
      <nav className="flex-1 overflow-y-auto py-4 no-scrollbar">
        {groups.map((g) => {
          const items = NAV.filter((n) => n.group === g && can(n.perm));
          if (!items.length) return null;
          return (
            <div key={g} className="mb-2">
              <p className="px-5 pb-1 pt-3 text-[9px] font-bold uppercase tracking-[0.26em] text-cream/30">{g}</p>
              {items.map((n) => {
                const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "block border-l-2 px-5 py-2 text-[13px] transition-colors",
                      active ? "border-clay bg-cream/10 font-semibold text-cream" : "border-transparent hover:bg-cream/5 hover:text-cream"
                    )}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-cream/10 p-4 text-xs">
        <Link href="/" className="block text-cream/60 hover:text-cream">← View Store</Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-off">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 z-40 hidden w-60 lg:block">{sidebar}</aside>
      {/* mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
        {/* topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><IconMenu className="h-6 w-6" /></button>
          <span className="hidden text-[11px] font-bold uppercase tracking-[0.2em] text-ink/50 sm:block">Bias Collection — Admin</span>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink font-serif text-xs text-cream">{initials(user.name)}</span>
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold leading-tight">{user.name}</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-claydark">{user.role}</p>
              </div>
            </div>
            <button
              onClick={async () => { await logoutSession(); router.push("/"); router.refresh(); }}
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700 hover:underline"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      const json = await res.json();
      if (json.ok) {
        setItems(json.data.notifications);
        setUnread(json.data.unreadCount);
      }
    } catch {}
  };

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        className="relative"
        onClick={async () => {
          setOpen((v) => !v);
          if (!open) {
            await load();
            fetch("/api/admin/notifications", { method: "POST" });
            setTimeout(() => setUnread(0), 1200);
          }
        }}
      >
        <IconBell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto border border-line bg-white shadow-xl">
          <p className="border-b border-line px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/50">Store Notifications</p>
          {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink/40">All quiet for now.</p>}
          {items.map((n) => (
            <div key={n.id} className="border-b border-line/60 px-4 py-3">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-xs text-ink/60">{n.message}</p>
              <p className="mt-1 text-[10px] text-ink/40">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
