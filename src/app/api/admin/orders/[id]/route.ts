import { handle, ok, fail, requirePermission } from "@/lib/api";
import { getOrderById, updateOrderStatus, appendNote, refundOrder } from "@/services/order.service";
import { hasPermission } from "@/lib/auth";

type Ctx = { params: { id: string } };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const auth = await requirePermission("orders.view");
  if ("response" in auth) return auth.response;
  const order = await getOrderById(params.id);
  if (!order) return fail("Order not found.", 404);
  return ok({ order });
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const auth = await requirePermission("orders.update");
  if ("response" in auth) return auth.response;
  const body = await req.json();

  if (body.action === "note") {
    await appendNote(params.id, String(body.note || ""), auth.session.id);
    return ok({ order: await getOrderById(params.id) });
  }

  if (body.action === "refund") {
    if (!hasPermission(auth.session, "orders.refund")) return fail("Missing permission: orders.refund", 403);
    try {
      const order = await refundOrder(params.id, body.amount ? Number(body.amount) : undefined, auth.session.id);
      return ok({ order });
    } catch (e: any) {
      return fail(e.message, 400);
    }
  }

  if (!body.status) return fail("status required");
  if (body.status === "CANCELLED" && !hasPermission(auth.session, "orders.cancel"))
    return fail("Missing permission: orders.cancel", 403);
  try {
    const order = await updateOrderStatus(params.id, String(body.status), {
      note: body.note,
      trackingNumber: body.trackingNumber,
      changedById: auth.session.id,
    });
    return ok({ order });
  } catch (e: any) {
    return fail(e.message, 400);
  }
});
