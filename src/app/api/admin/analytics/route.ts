import { handle, ok, fail } from "@/lib/api";
import { getSession, isStaff } from "@/lib/auth";
import { dashboardStats } from "@/services/analytics.service";
import { lowStockList } from "@/services/inventory.service";

export const GET = handle(async () => {
  // dashboard itself is visible to all staff (not just users with reports.view)
  const session = await getSession();
  if (!session) return fail("Authentication required.", 401);
  if (!isStaff(session)) return fail("Forbidden.", 403);

  const [stats, lowStock] = await Promise.all([dashboardStats(), lowStockList()]);
  return ok({ stats, lowStock: lowStock.slice(0, 8) });
});
