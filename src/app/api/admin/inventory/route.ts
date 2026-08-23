import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import { inventoryOverview, inventoryLogs, lowStockList, adjustStock } from "@/services/inventory.service";
import prisma from "@/lib/db";

export const GET = handle(async (req: Request) => {
  const auth = await requirePermission("inventory.view");
  if ("response" in auth) return auth.response;
  const sp = new URL(req.url).searchParams;
  if (sp.get("view") === "logs") {
    return ok(await inventoryLogs({ productId: sp.get("productId") || undefined, page: sp.get("page") ? Number(sp.get("page")) : 1 }));
  }
  if (sp.get("view") === "lowstock") return ok({ items: await lowStockList() });
  return ok(
    await inventoryOverview({ q: sp.get("q") || undefined, page: sp.get("page") ? Number(sp.get("page")) : 1 })
  );
});

export const POST = handle(async (req: Request) => {
  const auth = await requirePermission("inventory.manage");
  if ("response" in auth) return auth.response;
  const { productId, variantId, type, quantity, note } = await req.json();
  if (!productId || !type || !quantity) return fail("productId, type and quantity required.");
  const allowed = ["STOCK_ADDED", "STOCK_DAMAGED", "MANUAL_ADJUSTMENT", "STOCK_RETURNED"];
  if (!allowed.includes(type)) return fail("Invalid movement type.");
  try {
    const log = await adjustStock(prisma, {
      productId,
      variantId: variantId || null,
      type,
      quantity: Number(quantity),
      note: note || null,
      reference: "ADMIN",
      userId: auth.session.id,
    });
    await audit(auth.session.id, "adjust", "inventory", productId, `${type} ${quantity}`);
    return ok({ log });
  } catch (e: any) {
    return fail(e.message, 400);
  }
});
