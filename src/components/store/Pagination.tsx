import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Pagination({
  page,
  pages,
  buildHref,
}: {
  page: number;
  pages: number;
  buildHref: (p: number) => string;
}) {
  if (pages <= 1) return null;
  const items = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pages || Math.abs(p - page) <= 1
  );
  const result: (number | "…")[] = [];
  items.forEach((p, i) => {
    if (i > 0 && p - items[i - 1] > 1) result.push("…");
    result.push(p);
  });
  return (
    <nav className="mt-12 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={buildHref(page - 1)} className="border border-line bg-white px-3.5 py-2 text-xs font-semibold hover:border-ink">
          ← Prev
        </Link>
      )}
      {result.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-2 text-ink/40">…</span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            className={cn(
              "border px-3.5 py-2 text-xs font-semibold transition-colors",
              p === page ? "border-ink bg-ink text-cream" : "border-line bg-white hover:border-ink"
            )}
          >
            {p}
          </Link>
        )
      )}
      {page < pages && (
        <Link href={buildHref(page + 1)} className="border border-line bg-white px-3.5 py-2 text-xs font-semibold hover:border-ink">
          Next →
        </Link>
      )}
    </nav>
  );
}
