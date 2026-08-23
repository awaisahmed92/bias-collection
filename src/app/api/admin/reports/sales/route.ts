import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api";
import { salesReport, salesReportCsv } from "@/services/analytics.service";

export async function GET(req: Request) {
  const auth = await requirePermission("reports.view");
  if ("response" in auth) return auth.response;
  const sp = new URL(req.url).searchParams;
  const preset = sp.get("preset") || "month";

  const now = new Date();
  let from: Date, to: Date = new Date(now.setHours(23, 59, 59, 999));
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (preset === "today") from = startOfDay(new Date());
  else if (preset === "yesterday") {
    from = startOfDay(new Date(Date.now() - 86400000));
    to = new Date(from.getTime() + 86399999);
  } else if (preset === "week") from = startOfDay(new Date(Date.now() - 6 * 86400000));
  else if (preset === "custom") {
    from = sp.get("from") ? startOfDay(new Date(sp.get("from")!)) : startOfDay(new Date(Date.now() - 29 * 86400000));
    to = sp.get("to") ? new Date(new Date(sp.get("to")!).setHours(23, 59, 59, 999)) : to;
  } else from = startOfDay(new Date(Date.now() - 29 * 86400000));

  const report = await salesReport(from, to);

  if (sp.get("format") === "csv") {
    return new NextResponse(salesReportCsv(report), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bias-sales-report-${preset}.csv"`,
      },
    });
  }
  return NextResponse.json({ ok: true, data: report });
}
