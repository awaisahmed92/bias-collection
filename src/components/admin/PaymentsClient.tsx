"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn, formatDateTime, formatMoney, paymentStatusColor } from "@/lib/utils";

export default function PaymentsClient({ methods, transactions }: { methods: any[]; transactions: any }) {
  const router = useRouter();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (m: any) => {
    setBusy(m.key);
    await fetch("/api/admin/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: m.key, isEnabled: !m.isEnabled }),
    });
    setBusy(null);
    router.refresh();
  };

  const saveInstructions = async (m: any) => {
    setBusy(m.key);
    await fetch("/api/admin/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: m.key, instructions }),
    });
    setBusy(null);
    setEditingKey(null);
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Payment Methods</h1>
        <p className="text-sm text-ink/50">Enable/disable gateways. Secret API keys live in environment variables — never stored here.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {methods.map((m) => (
          <div key={m.key} className="admin-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-ink/40">{m.key}</p>
              </div>
              <button
                disabled={busy === m.key}
                onClick={() => toggle(m)}
                className={cn("relative h-6 w-11 rounded-full transition-colors", m.isEnabled ? "bg-emerald-600" : "bg-ink/20")}
                aria-label={`Toggle ${m.name}`}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", m.isEnabled ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>
            <p className="mt-2 text-sm text-ink/60">{m.description}</p>
            {["card", "wallet"].includes(m.key) && (
              <p className="mt-1 text-xs text-ink/40">Sandbox provider — connect a real gateway via env keys when ready.</p>
            )}
            {editingKey === m.key ? (
              <div className="mt-3">
                <label className="admin-label">Customer Instructions (shown at checkout/confirmation)</label>
                <textarea className="admin-input" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
                <div className="mt-2 flex gap-2">
                  <button className="admin-btn !py-1.5" disabled={busy === m.key} onClick={() => saveInstructions(m)}>Save</button>
                  <button className="admin-btn-outline !py-1.5" onClick={() => setEditingKey(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                {m.instructions && <p className="whitespace-pre-line border border-line bg-off p-3 text-xs text-ink/60">{m.instructions}</p>}
                <button className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline" onClick={() => { setEditingKey(m.key); setInstructions(m.instructions ?? ""); }}>
                  Edit Instructions
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-4 font-serif text-2xl">Transactions</h2>
        <div className="admin-card overflow-x-auto p-0">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-line bg-off">
                <th className="admin-th">Date</th><th className="admin-th">Order</th><th className="admin-th">Method</th>
                <th className="admin-th">Transaction ID</th><th className="admin-th">Status</th><th className="admin-th text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {transactions.items.map((t: any) => (
                <tr key={t.id} className="hover:bg-off/50">
                  <td className="admin-td text-ink/60">{formatDateTime(t.createdAt)}</td>
                  <td className="admin-td font-semibold text-claydark">{t.order.orderNumber}</td>
                  <td className="admin-td capitalize">{t.method.replace("_", " ")}</td>
                  <td className="admin-td font-mono text-xs text-ink/60">{t.transactionId ?? "—"}</td>
                  <td className="admin-td"><span className={`badge ${t.status === "SUCCESS" ? "bg-emerald-100 text-emerald-800" : t.status === "FAILED" ? "bg-rose-100 text-rose-800" : t.status === "REFUNDED" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}>{t.status}</span></td>
                  <td className="admin-td text-right font-semibold">{formatMoney(t.amount)}</td>
                </tr>
              ))}
              {transactions.items.length === 0 && <tr><td colSpan={6} className="admin-td py-10 text-center text-ink/40">No transactions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
