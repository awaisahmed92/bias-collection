import { formatMoney } from "@/lib/utils";

/** Pure-SVG bar chart (server-rendered, no deps). */
export function RevenueBarChart({ data }: { data: { label: string; revenue: number; orders: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const W = 720, H = 220, padB = 22, padT = 10;
  const bw = W / data.length;
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[560px]">
        {data.map((d, i) => {
          const h = Math.max(2, ((H - padB - padT) * d.revenue) / max);
          return (
            <g key={i}>
              <rect x={i * bw + bw * 0.2} y={H - padB - h} width={bw * 0.6} height={h} fill="#8f6b4f" rx={1}>
                <title>{`${d.label}: ${formatMoney(d.revenue)} · ${d.orders} orders`}</title>
              </rect>
              <text x={i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#17130e" opacity="0.55">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Hover bars for values — revenue by month</p>
    </div>
  );
}

export function MiniDonut({ parts }: { parts: { name: string; value: number; color: string }[] }) {
  const total = Math.max(1, parts.reduce((s, p) => s + p.value, 0));
  let acc = 0;
  const R = 15.9;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 42 42" className="h-28 w-28 -rotate-90">
        <circle cx="21" cy="21" r={R} fill="none" stroke="#efe8dc" strokeWidth="6" />
        {parts.map((p, i) => {
          const frac = p.value / total;
          const dash = `${frac * 100} ${100 - frac * 100}`;
          const offset = 25 - acc * 100;
          acc += frac;
          return <circle key={i} cx="21" cy="21" r={R} fill="none" stroke={p.color} strokeWidth="6" strokeDasharray={dash} strokeDashoffset={offset} />;
        })}
      </svg>
      <ul className="space-y-1.5">
        {parts.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5" style={{ background: p.color }} />
            <span className="text-ink/70">{p.name}</span>
            <span className="font-semibold">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
