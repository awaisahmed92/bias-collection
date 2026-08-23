"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/stores/session";
import { useCart } from "@/stores/cart";
import { useWishlist } from "@/stores/wishlist";
import { Spinner } from "@/components/ui/primitives";

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();
  const refreshSession = useSession((s) => s.refresh);
  const refreshCart = useCart((s) => s.refresh);
  const wishlistIds = useWishlist((s) => s.ids);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<{ loading: boolean; error?: string }>({ loading: false });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ loading: true });
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!json.ok) return setState({ loading: false, error: json.error });
    // merge guest wishlist + refresh stores
    if (wishlistIds.length) {
      await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merge: true, productIds: wishlistIds }),
      });
    }
    await Promise.all([refreshSession(), refreshCart()]);
    const role = json.data.user?.role;
    const next = sp.get("next");
    router.push(next || (role && role !== "customer" ? "/admin" : "/account"));
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Email</label>
        <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div>
        <label className="label">Password</label>
        <input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      {state.error && <p className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
      <button disabled={state.loading} className="btn-primary w-full">
        {state.loading ? <Spinner /> : "Login"}
      </button>
      <p className="text-center text-sm text-ink/60">
        New here? <Link href="/register" className="font-semibold underline underline-offset-4">Create an account</Link>
      </p>
    </form>
  );
}

export default function LoginForm() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
