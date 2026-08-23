"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/stores/session";
import { useCart } from "@/stores/cart";
import { Spinner } from "@/components/ui/primitives";

export default function RegisterForm() {
  const router = useRouter();
  const refreshSession = useSession((s) => s.refresh);
  const refreshCart = useCart((s) => s.refresh);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "" });
  const [state, setState] = useState<{ loading: boolean; error?: string }>({ loading: false });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setState({ loading: false, error: "Passwords do not match." });
    setState({ loading: true });
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, password: form.password }),
    });
    const json = await res.json();
    if (!json.ok) return setState({ loading: false, error: json.error });
    await Promise.all([refreshSession(), refreshCart()]);
    router.push("/account");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">First Name</label>
          <input required className="input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input required className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Email</label>
        <input type="email" required className="input" value={form.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div>
        <label className="label">Phone (optional)</label>
        <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+92 3XX XXXXXXX" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Password</label>
          <input type="password" required minLength={6} className="input" value={form.password} onChange={(e) => set("password", e.target.value)} />
        </div>
        <div>
          <label className="label">Confirm</label>
          <input type="password" required className="input" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} />
        </div>
      </div>
      {state.error && <p className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
      <button disabled={state.loading} className="btn-primary w-full">
        {state.loading ? <Spinner /> : "Create Account"}
      </button>
      <p className="text-center text-sm text-ink/60">
        Already registered? <Link href="/login" className="font-semibold underline underline-offset-4">Login</Link>
      </p>
    </form>
  );
}
