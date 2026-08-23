import { handle, ok, requirePermission } from "@/lib/api";
import { dashboardStats } from "@/services/analytics.service";
import { lowStockList } from "@/services/inventory.service";

export const GET = handle(async () => {
  const auth = await requirePermission("reports.view");
  if ("response" in auth) {
    // dashboard itself is visible to all staff; only require auth
    const { requireAuth } = await import("@/lib/api");
    const a2 = await requireAuth();
    if ("response" in a2) return a2.response;
  }
  const [stats, lowStock] = await Promise.all([dashboardStats(), lowStockList()]);
  return ok({ stats, lowStock: lowStock.slice(0, 8) });
});
