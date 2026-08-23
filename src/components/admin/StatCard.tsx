import { cn } from "@/lib/utils";

export default function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("border border-line bg-white p-5", accent && "border-claydark bg-ink text-cream")}>
      <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em] text-ink/50", accent && "text-cream/60")}>{label}</p>
      <p className="mt-2 font-serif text-[26px] leading-none">{value}</p>
      {hint && <p className={cn("mt-2 text-xs text-ink/40", accent && "text-cream/50")}>{hint}</p>}
    </div>
  );
}
