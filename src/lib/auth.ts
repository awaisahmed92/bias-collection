import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import prisma from "./db";

export const SESSION_COOKIE = "bias_session";
export const CART_COOKIE = "bias_cart";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleLabel: string;
  permissions: string[];
};

export async function signSessionToken(userId: string): Promise<string> {
  const days = Number(process.env.SESSION_TTL_DAYS || 7);
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) || null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const token = await signSessionToken(userId);
  const days = Number(process.env.SESSION_TTL_DAYS || 7);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
    roleLabel: user.role.label,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  };
}

/** True for super_admin, or when the role owns the given permission key. */
export function hasPermission(session: SessionUser | null, key: string): boolean {
  if (!session) return false;
  if (session.role === "super_admin") return true;
  return session.permissions.includes(key);
}

export function isStaff(session: SessionUser | null): boolean {
  return !!session && session.role !== "customer";
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}
