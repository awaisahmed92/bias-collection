"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ToggleCustomerButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      className={isActive ? "admin-btn-outline !border-rose-300 !text-rose-700 hover:!bg-rose-700" : "admin-btn"}
      onClick={async () => {
        if (!confirm(isActive ? "Deactivate this customer? They won't be able to login." : "Reactivate this customer?")) return;
        setBusy(true);
        await fetch(`/api/admin/customers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !isActive }),
        });
        router.refresh();
        setBusy(false);
      }}
    >
      {busy ? "…" : isActive ? "Deactivate Customer" : "Reactivate Customer"}
    </button>
  );
}
