export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * JSON.stringify does not escape `<`, so a value containing `</script><script>...` breaks out of
 * a `<script type="application/ld+json">` tag and executes. Use this instead of a bare
 * JSON.stringify whenever building the `__html` for a JSON-LD script tag.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "Rs.";
export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "Bias Collection";

export function formatMoney(n: number | null | undefined): string {
  const v = Math.round(Number(n ?? 0));
  return `${CURRENCY} ${v.toLocaleString("en-PK")}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
] as const;

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;

export function orderStatusColor(status: string): string {
  switch (status) {
    case "PENDING": return "bg-amber-100 text-amber-800";
    case "CONFIRMED": return "bg-sky-100 text-sky-800";
    case "PROCESSING": return "bg-blue-100 text-blue-800";
    case "PACKED": return "bg-indigo-100 text-indigo-800";
    case "SHIPPED": return "bg-violet-100 text-violet-800";
    case "DELIVERED": return "bg-emerald-100 text-emerald-800";
    case "CANCELLED": return "bg-rose-100 text-rose-800";
    case "RETURNED": return "bg-orange-100 text-orange-800";
    case "REFUNDED": return "bg-slate-200 text-slate-700";
    default: return "bg-slate-100 text-slate-700";
  }
}

export function paymentStatusColor(status: string): string {
  switch (status) {
    case "PAID": return "bg-emerald-100 text-emerald-800";
    case "FAILED": return "bg-rose-100 text-rose-800";
    case "REFUNDED": case "PARTIALLY_REFUNDED": return "bg-slate-200 text-slate-700";
    default: return "bg-amber-100 text-amber-800";
  }
}

export function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
