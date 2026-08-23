"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ORDER_STATUSES, formatDateTime } from "@/lib/utils";
import { Spinner } from "@/components/ui/primitives";

export default function OrderAdminClient({ order }: { order: any }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [refundAmount, setRefundAmount] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = async (body: any, tag: string) => {
    setBusy(tag);
    setError(null);
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setBusy(null);
    if (!json.ok) setError(json.error);
    else router.refresh();
  };

  return (
    <div className="space-y-6 no-print">
      {error && <p className="border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}

      {/* status */}
      <div className="admin-card">
        <h3 className="mb-3 font-serif text-lg">Update Status</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="admin-input" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button disabled={busy === "status" || status === order.status} className="admin-btn" onClick={() => patch({ status, note, trackingNumber: tracking || undefined }, "status")}>
            {busy === "status" ? <Spinner /> : "Apply"}
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="admin-input" placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
          <button disabled={busy === "tracking"} className="admin-btn-outline" onClick={() => patch({ status, trackingNumber: tracking, note: "Tracking updated" }, "tracking")}>
            Save Tracking
          </button>
        </div>
      </div>

      {/* internal notes */}
      <div className="admin-card">
        <h3 className="mb-3 font-serif text-lg">Internal Notes</h3>
        {order.internalNotes && <pre className="mb-3 whitespace-pre-wrap bg-off p-3 text-xs text-ink/70">{order.internalNotes}</pre>}
        <div className="flex gap-3">
          <input className="admin-input" placeholder="Add a private note…" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
          <button
            disabled={busy === "note" || !internalNote.trim()}
            className="admin-btn-outline"
            onClick={async () => {
              await patch({ action: "note", note: internalNote }, "note");
              setInternalNote("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* refund */}
      {["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus) && (
        <div className="admin-card border-rose-200">
          <h3 className="mb-3 font-serif text-lg text-rose-800">Refund</h3>
          <div className="flex flex-wrap gap-3">
            <input className="admin-input max-w-[180px]" placeholder={`Amount (max ${Math.round(order.total)})`} type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            <button
              disabled={busy === "refund"}
              className="admin-btn !bg-rose-700 hover:!bg-rose-800"
              onClick={() => {
                if (!confirm(`Process refund${refundAmount ? ` of Rs. ${refundAmount}` : " for the full amount"}?`)) return;
                patch({ action: "refund", amount: refundAmount ? Number(refundAmount) : undefined }, "refund");
              }}
            >
              {busy === "refund" ? <Spinner /> : "Process Refund"}
            </button>
            <p className="self-center text-xs text-ink/40">Leave empty for a full refund. Stock is not restored automatically for partial refunds.</p>
          </div>
        </div>
      )}

      {/* timeline */}
      <div className="admin-card">
        <h3 className="mb-3 font-serif text-lg">Order Timeline</h3>
        <ol className="space-y-3">
          {order.history.map((h: any) => (
            <li key={h.id} className="flex gap-3 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-claydark" />
              <div>
                <span className="font-semibold">{h.status}</span>
                <span className="ml-2 text-xs text-ink/40">{formatDateTime(h.createdAt)}{h.changedBy ? ` · by ${h.changedBy.firstName} ${h.changedBy.lastName}` : ""}</span>
                {h.note && <p className="text-xs text-ink/50">{h.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
