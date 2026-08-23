import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import {
  listShippingMethods,
  createShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
} from "@/services/shipping.service";

export const GET = handle(async () => {
  const auth = await requirePermission("shipping.manage");
  if ("response" in auth) return auth.response;
  return ok({ methods: await listShippingMethods(false) });
});

export const POST = handle(async (req: Request) => {
  const auth = await requirePermission("shipping.manage");
  if ("response" in auth) return auth.response;
  const body = await req.json();
  try {
    const method = body.id ? await updateShippingMethod(String(body.id), body) : await createShippingMethod(body);
    await audit(auth.session.id, body.id ? "update" : "create", "shipping", method.id, method.name);
    return ok({ method });
  } catch (e: any) {
    if (e?.name === "ZodError") throw e;
    return fail(e.message, 400);
  }
});

export const DELETE = handle(async (req: Request) => {
  const auth = await requirePermission("shipping.manage");
  if ("response" in auth) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("id required");
  await deleteShippingMethod(id);
  await audit(auth.session.id, "delete", "shipping", id);
  return ok({ deleted: true });
});
