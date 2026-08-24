import { createHmac, timingSafeEqual } from "crypto";

const secret = process.env.JWT_SECRET || "dev-secret";

/** Opaque, unguessable proof that the holder was handed this order's confirmation link. */
export function generateOrderToken(orderId: string): string {
  return createHmac("sha256", secret).update(orderId).digest("hex");
}

export function verifyOrderToken(orderId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = generateOrderToken(orderId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
