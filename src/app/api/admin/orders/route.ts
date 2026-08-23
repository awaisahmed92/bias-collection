import { handle, ok, requirePermission } from "@/lib/api";
import { adminListOrders } from "@/services/order.service";

export const GET = handle(async (req: Request) => {
  const auth = await requirePermission("orders.view");
  if ("response" in auth) return auth.response;
  const sp = new URL(req.url).searchParams;
  return ok(
    await adminListOrders({
      q: sp.get("q") || undefined,
      status: sp.get("status") || undefined,
      paymentMethod: sp.get("paymentMethod") || undefined,
      paymentStatus: sp.get("paymentStatus") || undefined,
      from: sp.get("from") || undefined,
      to: sp.get("to") || undefined,
      page: sp.get("page") ? Number(sp.get("page")) : 1,
    })
  );
});
