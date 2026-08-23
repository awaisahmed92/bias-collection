"use client";
import { useState } from "react";
import { Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export default function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ loading: boolean; message?: string; error?: string }>({ loading: false });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ loading: true });
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.ok) {
        setState({ loading: false, message: json.data.message });
        setEmail("");
      } else setState({ loading: false, error: json.error });
    } catch {
      setState({ loading: false, error: "Something went wrong. Try again." });
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="flex">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className={cn(
            "w-full px-3.5 py-2.5 text-sm focus:outline-none",
            dark ? "border border-cream/20 bg-transparent text-cream placeholder:text-cream/40" : "input"
          )}
        />
        <button
          disabled={state.loading}
          className={cn(
            "whitespace-nowrap px-4 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors disabled:opacity-60",
            dark ? "bg-cream text-ink hover:bg-sand" : "bg-ink text-cream hover:bg-claydark"
          )}
        >
          {state.loading ? <Spinner /> : "Subscribe"}
        </button>
      </form>
      {state.message && <p className={cn("mt-2 text-xs", dark ? "text-emerald-300" : "text-emerald-700")}>{state.message}</p>}
      {state.error && <p className="mt-2 text-xs text-rose-500">{state.error}</p>}
    </div>
  );
}
