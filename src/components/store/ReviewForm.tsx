"use client";
import { useState } from "react";
import { useSession } from "@/stores/session";
import Link from "next/link";
import { Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export default function ReviewForm({ productId, onSubmitted }: { productId: string; onSubmitted?: () => void }) {
  const user = useSession((s) => s.user);
  const loaded = useSession((s) => s.loaded);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<{ loading: boolean; message?: string; error?: string }>({ loading: false });

  if (!loaded) return null;
  if (!user)
    return (
      <p className="mt-4 text-sm text-ink/60">
        <Link href={`/login?next=/account`} className="font-semibold underline underline-offset-4">Login</Link> to write a review.
      </p>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ loading: true });
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, comment }),
    });
    const json = await res.json();
    if (json.ok) {
      setState({ loading: false, message: json.data.message });
      setComment("");
      onSubmitted?.();
    } else setState({ loading: false, error: json.error });
  };

  if (state.message) return <p className="mt-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>;

  return (
    <form onSubmit={submit} className="mt-6 border border-line bg-white p-5">
      <p className="text-sm font-semibold">Write a review</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            type="button"
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            className={cn("text-2xl leading-none", (hover || rating) >= i ? "text-gold" : "text-ink/20")}
            aria-label={`${i} star`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="textarea mt-3"
        placeholder="How was the fabric, fit and delivery?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
      />
      {state.error && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
      <button disabled={state.loading} className="btn-primary btn-sm mt-3">
        {state.loading ? <Spinner /> : "Submit Review"}
      </button>
    </form>
  );
}
