"use client";
import { useState } from "react";
import { Spinner } from "@/components/ui/primitives";

export default function ContactForm() {
  const [state, setState] = useState<{ loading: boolean; message?: string; error?: string }>({ loading: false });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState({ loading: true });
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fd.get("name"), email: fd.get("email"), message: fd.get("message") }),
    });
    const json = await res.json();
    if (json.ok) {
      setState({ loading: false, message: json.data.message });
      e.currentTarget.reset();
    } else setState({ loading: false, error: json.error });
  };

  if (state.message)
    return <div className="border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">{state.message}</div>;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input name="name" required className="input" placeholder="Your name" />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="input" placeholder="you@example.com" />
        </div>
      </div>
      <div>
        <label className="label">Message</label>
        <textarea name="message" required className="textarea min-h-[140px]" placeholder="How can we help?" />
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button disabled={state.loading} className="btn-primary">
        {state.loading ? <Spinner /> : "Send Message"}
      </button>
    </form>
  );
}
