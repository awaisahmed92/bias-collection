import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { CART_COOKIE } from "@/lib/auth";
import {
  freeShippingThreshold,
  freeUnitsForLine,
  getActivePromotions,
  priceForProduct,
} from "./discount.service";

// ─────────────────────────── Cart identity ───────────────────────────

export function readCartToken(): string | undefined {
  return cookies().get(CART_COOKIE)?.value;
}

export function writeCartToken(token: string) {
  cookies().set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/** Resolve the active cart for this request (guest by cookie token, or the user's cart). Creates one if needed. */
export async function resolveCart(userId?: string | null) {
  const token = readCartToken();

  if (userId) {
    // prefer the user's own cart
    let cart = await prisma.cart.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
    if (!cart) {
      // adopt guest cart if one exists
      const guest = token ? await prisma.cart.findUnique({ where: { token } }) : null;
      if (guest) {
        cart = await prisma.cart.update({ where: { id: guest.id }, data: { userId } });
      } else {
        cart = await prisma.cart.create({ data: { userId, token: crypto.randomUUID() } });
      }
    }
    if (token !== cart.token) writeCartToken(cart.token);
    return cart;
  }

  if (token) {
    const cart = await prisma.cart.findUnique({ where: { token } });
    if (cart) return cart;
  }
  const newToken = crypto.randomUUID();
  const cart = await prisma.cart.create({ data: { token: newToken } });
  writeCartToken(newToken);
  return cart;
}

/** Merge a guest cart into the user's cart (called at login/register). */
export async function mergeGuestCartIntoUser(userId: string) {
  const token = readCartToken();
  if (!token) return;
  const guestCart = await prisma.cart.findUnique({ where: { token }, include: { items: true } });
  if (!guestCart || guestCart.userId === userId) return;

  let userCart = await prisma.cart.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
  if (!userCart) {
    await prisma.cart.update({ where: { id: guestCart.id }, data: { userId } });
    return;
  }

  for (const item of guestCart.items) {
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: userCart.id, productId: item.productId, variantId: item.variantId ?? null },
    });
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + item.quantity } });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          priceAtAdd: item.priceAtAdd,
        },
      });
    }
  }
  await prisma.cart.delete({ where: { id: guestCart.id } });
  writeCartToken(userCart.token);
}

// ─────────────────────────── Mutations ───────────────────────────

export class CartError extends Error {}

export async function addItem(opts: { userId?: string | null; productId: string; variantId?: string | null; quantity: number }) {
  const { userId, productId, variantId, quantity } = opts;
  if (quantity < 1) throw new CartError("Quantity must be at least 1.");

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { where: { isActive: true } } },
  });
  if (!product || product.status !== "ACTIVE") throw new CartError("Product unavailable.");

  let variant = null as (typeof product.variants)[number] | null;
  if (product.variants.length) {
    if (!variantId) throw new CartError("Please select a size/color first.");
    variant = product.variants.find((v) => v.id === variantId) ?? null;
    if (!variant) throw new CartError("Selected option is unavailable.");
    const available = Math.max(0, variant.stock - variant.reservedStock);
    if (!product.allowBackorder && quantity > available)
      throw new CartError(`Only ${available} left in stock for this option.`);
  } else {
    const available = Math.max(0, product.stock - product.reservedStock);
    if (!product.allowBackorder && quantity > available)
      throw new CartError(`Only ${available} left in stock.`);
  }

  const cart = await resolveCart(userId);

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variantId ?? null },
  });
  const unitPrice = variant?.price ?? product.originalPrice;
  if (existing) {
    const newQty = existing.quantity + quantity;
    const stockCap = variant ? variant.stock - variant.reservedStock : product.stock - product.reservedStock;
    if (!product.allowBackorder && newQty > stockCap)
      throw new CartError(`Only ${Math.max(0, stockCap)} available in total for this item.`);
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity, priceAtAdd: unitPrice },
    });
  }
  await prisma.cart.update({ where: { id: cart.id }, data: {} }); // bump updatedAt
  return cart;
}

export async function updateItemQuantity(cartItemId: string, quantity: number, userId?: string | null) {
  const cart = await resolveCart(userId);
  const item = await prisma.cartItem.findUnique({ where: { id: cartItemId }, include: { product: { include: { variants: true } }, variant: true } });
  if (!item || item.cartId !== cart.id) throw new CartError("Cart item not found.");
  if (quantity < 1) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return;
  }
  const p = item.product;
  const cap = item.variant ? item.variant.stock - item.variant.reservedStock : p.stock - p.reservedStock;
  if (!p.allowBackorder && quantity > Math.max(0, cap)) throw new CartError(`Only ${Math.max(0, cap)} left in stock.`);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
}

export async function removeItem(cartItemId: string, userId?: string | null) {
  const cart = await resolveCart(userId);
  const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
  if (!item || item.cartId !== cart.id) throw new CartError("Cart item not found.");
  await prisma.cartItem.delete({ where: { id: cartItemId } });
}

export async function clearCart(cartId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId } });
}

// ─────────────────────────── Summary / pricing ───────────────────────────

export type CartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantName: string | null;
  sku: string;
  image: string | null;
  quantity: number;
  unitBase: number;
  unitFinal: number;
  unitLabel: string | null;
  freeUnits: number;
  bxgySavings: number;
  lineTotal: number;
  lineSavings: number;
  available: number;
  inStock: boolean;
  status: string;
};

export type CartSummary = {
  cartId: string | null;
  items: CartLine[];
  itemCount: number;
  subtotal: number; // sum of line totals (after item-level discounts & BXGY)
  originalSubtotal: number; // sum of base prices
  savings: number; // item-level + BXGY savings
  freeShippingThreshold: number | null; // active store promo threshold (if any)
};

export async function getCartSummary(userId?: string | null): Promise<CartSummary> {
  const token = readCartToken();
  const cart = userId
    ? (await prisma.cart.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } })) ??
      (token ? await prisma.cart.findUnique({ where: { token } }) : null)
    : token
      ? await prisma.cart.findUnique({ where: { token } })
      : null;

  if (!cart) return emptySummary();

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
      variant: true,
    },
    orderBy: { createdAt: "asc" },
  });
  if (!items.length) return emptySummary(cart.id);

  const promos = await getActivePromotions();
  const threshold = freeShippingThreshold(promos);

  let subtotal = 0;
  let original = 0;

  const lines: CartLine[] = items.map((item) => {
    const p = item.product;
    const v = item.variant;
    const price = priceForProduct(p as any, promos, v);
    const { freeUnits, promo } = freeUnitsForLine(p.id, item.quantity, promos);
    const bxgySavings = freeUnits * price.final;
    const lineTotal = item.quantity * price.final - bxgySavings;
    subtotal += lineTotal;
    original += item.quantity * price.base;
    const available = v ? Math.max(0, v.stock - v.reservedStock) : Math.max(0, p.stock - p.reservedStock);
    return {
      id: item.id,
      productId: p.id,
      variantId: v?.id ?? null,
      slug: p.slug,
      name: p.name,
      variantName: v ? [v.size, v.color].filter(Boolean).join(" / ") || null : null,
      sku: v?.sku ?? p.sku,
      image: v?.image || p.images[0]?.url || null,
      quantity: item.quantity,
      unitBase: price.base,
      unitFinal: price.final,
      unitLabel: promo && freeUnits > 0 ? `${promo.name}` : price.label,
      freeUnits,
      bxgySavings,
      lineTotal,
      lineSavings: item.quantity * (price.base - price.final) + bxgySavings,
      available,
      inStock: p.allowBackorder || item.quantity <= available,
      status: p.status,
    };
  });

  return {
    cartId: cart.id,
    items: lines,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal,
    originalSubtotal: original,
    savings: original - subtotal,
    freeShippingThreshold: threshold,
  };
}

function emptySummary(cartId: string | null = null): CartSummary {
  return { cartId, items: [], itemCount: 0, subtotal: 0, originalSubtotal: 0, savings: 0, freeShippingThreshold: null };
}
