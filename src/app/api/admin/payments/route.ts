import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import { listPaymentMethods, updatePaymentMethod, listTransactions } from "@/services/payment.service";
import { listNotifications, markAllRead } from "@/services/notification.service";

export const GET = handle(async (req: Request) => {
  const auth = await requirePermission("payments.manage");
  if ("response" in auth) return auth.response;
  const sp = new URL(req.url).searchParams;
  const [methods, transactions] = await Promise.all([
    listPaymentMethods(),
    listTransactions({ page: sp.get("page") ? Number(sp.get("page")) : 1, status: sp.get("status") || undefined }),
  ]);
  return ok({ methods, transactions });
});

export const PATCH = handle(async (req: Request) => {
  const auth = await requirePermission("payments.manage");
  if ("response" in auth) return auth.response;
  const { key, isEnabled, instructions, description } = await req.json();
  if (!key) return fail("key required");
  const method = await updatePaymentMethod(key, {
    isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : undefined,
    instructions: instructions ?? undefined,
    description: description ?? undefined,
  });
  await audit(auth.session.id, "update", "payment_method", key, `isEnabled=${method.isEnabled}`);
  return ok({ method });
});
