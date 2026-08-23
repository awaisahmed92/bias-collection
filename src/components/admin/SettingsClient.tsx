"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/primitives";

const FIELDS: { key: string; label: string; hint?: string; type?: string }[] = [
  { key: "storeName", label: "Store Name" },
  { key: "storeEmail", label: "Store Email" },
  { key: "storePhone", label: "Store Phone" },
  { key: "storeAddress", label: "Store Address" },
  { key: "currency", label: "Currency Symbol", hint: "Shown before prices, e.g. Rs." },
  { key: "taxRatePercent", label: "Tax Rate %", hint: "Applied on discounted subtotal at checkout", type: "number" },
  { key: "announcement", label: "Announcement Bar Text", hint: "Shown at the very top of the storefront" },
  { key: "facebookUrl", label: "Facebook URL" },
  { key: "instagramUrl", label: "Instagram URL" },
  { key: "whatsappNumber", label: "WhatsApp Number" },
];

export default function SettingsClient({ settings }: { settings: Record<string, string> }) {
  const router = useRouter();
  const [values, setValues] = useState(settings);
  const [state, setState] = useState<{ saving: boolean; message?: string; error?: string }>({ saving: false });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ saving: true });
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!json.ok) setState({ saving: false, error: json.error });
    else {
      setState({ saving: false, message: "Settings saved." });
      router.refresh();
      setTimeout(() => setState({ saving: false }), 2500);
    }
  };

  return (
    <form onSubmit={save} className="max-w-2xl">
      <h1 className="mb-6 font-serif text-3xl">Store Settings</h1>
      <div className="admin-card space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="admin-label">{f.label}</label>
            <input
              type={f.type ?? "text"}
              className="admin-input"
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            />
            {f.hint && <p className="mt-1 text-xs text-ink/40">{f.hint}</p>}
          </div>
        ))}
      </div>
      {state.error && <p className="mt-4 text-sm text-rose-600">{state.error}</p>}
      {state.message && <p className="mt-4 text-sm font-semibold text-emerald-700">{state.message}</p>}
      <button disabled={state.saving} className="admin-btn mt-6">{state.saving ? <Spinner /> : "Save Settings"}</button>
    </form>
  );
}
