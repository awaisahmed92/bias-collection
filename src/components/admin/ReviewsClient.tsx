"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Stars } from "@/components/ui/primitives";
import { cn, formatDate } from "@/lib/utils";

export default function ReviewsClient({ reviews, status }: { reviews: any[]; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, action: "APPROVED" | "REJECTED" | "PENDING" | "delete") => {
    setBusy(id);
    if (action === "delete") {
      if (!confirm("Delete this review permanently?")) return setBusy(null);
      await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" });
    } else {
      await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: action }),
      });
    }
    setBusy(null);
    router.refresh();
  };

  const tabs = ["ALL", "PENDING", "APPROVED", "REJECTED"];

  return (
    <div>
      <h1 className="font-serif text-3xl">Reviews</h1>
      <div className="mb-5 mt-4 flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => router.push(`/admin/reviews?status=${t}`)}
            className={cn("border-b-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em]", status === t ? "border-ink text-ink" : "border-transparent text-ink/40")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="admin-card flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <Stars value={r.rating} />
                <span className={cn("badge", r.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : r.status === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500")}>{r.status}</span>
              </div>
              <p className="mt-1 text-sm">
                <a href={`/product/${r.product.slug}`} target="_blank" className="font-semibold text-claydark hover:underline">{r.product.name}</a>
                <span className="text-ink/40"> · by {r.user.firstName} {r.user.lastName} ({r.user.email}) · {formatDate(r.createdAt)}</span>
              </p>
              {r.comment && <p className="mt-1.5 text-sm text-ink/70">{r.comment}</p>}
            </div>
            <div className="flex gap-2">
              {r.status !== "APPROVED" && (
                <button disabled={busy === r.id} className="admin-btn !py-1.5" onClick={() => act(r.id, "APPROVED")}>Approve</button>
              )}
              {r.status !== "REJECTED" && (
                <button disabled={busy === r.id} className="admin-btn-outline !py-1.5" onClick={() => act(r.id, "REJECTED")}>{r.status === "APPROVED" ? "Hide" : "Reject"}</button>
              )}
              <button disabled={busy === r.id} className="admin-btn-outline !border-rose-300 !py-1.5 !text-rose-700" onClick={() => act(r.id, "delete")}>Delete</button>
            </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-sm text-ink/40">No reviews in this bucket.</p>}
      </div>
    </div>
  );
}
