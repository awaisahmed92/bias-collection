import { NextResponse } from "next/server";
import prisma from "./db";
import { getSession, hasPermission, type SessionUser } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...(extra || {}) }, { status });
}

/** Require a logged-in user. Returns the session or a ready-to-return NextResponse. */
export async function requireAuth(): Promise<{ session: SessionUser } | { response: NextResponse }> {
  const session = await getSession();
  if (!session) return { response: fail("Authentication required.", 401) };
  return { session };
}

/** Require a permission (super_admin bypasses). */
export async function requirePermission(
  key: string
): Promise<{ session: SessionUser } | { response: NextResponse }> {
  const session = await getSession();
  if (!session) return { response: fail("Authentication required.", 401) };
  if (session.role === "customer") return { response: fail("Forbidden.", 403) };
  if (!hasPermission(session, key)) return { response: fail(`Missing permission: ${key}`, 403) };
  return { session };
}

// ── naive in-memory rate limiter (use Redis in production) ──
const buckets = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/**
 * X-Forwarded-For / X-Real-Ip are attacker-controlled unless a trusted reverse proxy overwrites
 * them before the request reaches this app. Only honor them when TRUST_PROXY=true is set (i.e.
 * you've actually deployed behind such a proxy — nginx/Caddy/etc — configured to strip
 * client-supplied values). Otherwise every request maps to the same bucket, which turns rate
 * limiting into a blunt global throttle instead of a spoofable per-IP one — safe default until a
 * real proxy is in front of this app.
 */
export function clientIp(req: Request): string {
  if (process.env.TRUST_PROXY === "true") {
    return (
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"
    );
  }
  return "unknown";
}

/** Audit trail for admin actions. */
export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  details?: string
) {
  try {
    await prisma.auditLog.create({
      data: { userId: userId ?? undefined, action, entity, entityId: entityId ?? undefined, details },
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}

/** Robust wrapper for JSON route handlers. */
export function handle<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (e: any) {
      if (e?.name === "ZodError") {
        return fail(e.errors?.[0]?.message || "Validation failed.", 400, { issues: e.errors });
      }
      console.error("[api error]", e);
      return fail(e?.message || "Unexpected server error.", 500);
    }
  };
}
