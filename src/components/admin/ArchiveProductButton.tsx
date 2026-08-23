"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ArchiveProductButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700 hover:underline disabled:opacity-50"
      onClick={async () => {
        if (!confirm("Archive this product? It will disappear from the storefront.")) return;
        setBusy(true);
        await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      {busy ? "…" : "Archive"}
    </button>
  );
}
