import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-helpers";
import { salesReport } from "@/services/analytics.service";
import ReportsClient from "@/components/admin/ReportsClient";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({ searchParams }: { searchParams: Record<string, string> }) {
  const session = await requireAuth();
  const preset = searchParams.preset || "month";
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let from: Date, to: Date = new Date();
  if (preset === "today") from = startOfDay(now);
  else if (preset === "yesterday") {
    from = startOfDay(new Date(Date.now() - 86400000));
    to = new Date(from.getTime() + 86399999);
  } else if (preset === "week") from = startOfDay(new Date(Date.now() - 6 * 86400000));
  else if (preset === "custom") {
    from = searchParams.from ? startOfDay(new Date(searchParams.from)) : startOfDay(new Date(Date.now() - 29 * 86400000));
    to = searchParams.to ? new Date(new Date(searchParams.to).setHours(23, 59, 59, 999)) : now;
  } else from = startOfDay(new Date(Date.now() - 29 * 86400000));

  const report = await salesReport(from, to);
  return (
    <Suspense>
      <ReportsClient
        report={JSON.parse(JSON.stringify(report))}
        preset={preset}
        from={searchParams.from}
        to={searchParams.to}
      />
    </Suspense>
  );
}
