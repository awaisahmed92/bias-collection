import { handle, ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { addItem, updateItemQuantity, removeItem, getCartSummary, CartError } from "@/services/cart.service";

export const GET = handle(async () => {
  const session = await getSession();
  return ok({ summary: await getCartSummary(session?.id ?? null) });
});

export const POST = handle(async (req: Request) => {
  const session = await getSession();
  const { productId, variantId, quantity = 1 } = await req.json();
  if (!productId) return fail("productId required");
  try {
    await addItem({ userId: session?.id ?? null, productId, variantId: variantId ?? null, quantity: Number(quantity) || 1 });
  } catch (e) {
    if (e instanceof CartError) return fail(e.message, 400);
    throw e;
  }
  return ok({ summary: await getCartSummary(session?.id ?? null) });
});

export const PATCH = handle(async (req: Request) => {
  const session = await getSession();
  const { itemId, quantity } = await req.json();
  if (!itemId) return fail("itemId required");
  try {
    await updateItemQuantity(String(itemId), Number(quantity), session?.id ?? null);
  } catch (e) {
    if (e instanceof CartError) return fail(e.message, 400);
    throw e;
  }
  return ok({ summary: await getCartSummary(session?.id ?? null) });
});

export const DELETE = handle(async (req: Request) => {
  const session = await getSession();
  const itemId = new URL(req.url).searchParams.get("itemId");
  if (!itemId) return fail("itemId required");
  try {
    await removeItem(itemId, session?.id ?? null);
  } catch (e) {
    if (e instanceof CartError) return fail(e.message, 400);
    throw e;
  }
  return ok({ summary: await getCartSummary(session?.id ?? null) });
});
