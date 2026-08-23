import { z } from "zod";
import prisma from "@/lib/db";
import { hashPassword, verifyPassword, setSessionCookie, type SessionUser } from "@/lib/auth";
import { mergeGuestCartIntoUser } from "./cart.service";
import { notify } from "./notification.service";

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password required"),
});

export class AuthError extends Error {}

async function toSession(userId: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user) return null;
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

export async function registerCustomer(raw: unknown): Promise<SessionUser> {
  const input = registerSchema.parse(raw);
  const email = input.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new AuthError("An account with this email already exists.");

  const role = await prisma.role.findUnique({ where: { name: "customer" } });
  if (!role) throw new AuthError("System not initialized — run the seed script.");

  const user = await prisma.user.create({
    data: {
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone || null,
      passwordHash: await hashPassword(input.password),
      roleId: role.id,
    },
  });

  await setSessionCookie(user.id);
  await mergeGuestCartIntoUser(user.id);
  await notify({
    userId: user.id,
    type: "WELCOME",
    title: "Welcome to Bias Collection",
    message: `Hi ${user.firstName}, your account is ready. Happy shopping!`,
  });
  const session = await toSession(user.id);
  return session!;
}

export async function login(raw: unknown): Promise<SessionUser> {
  const input = loginSchema.parse(raw);
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new AuthError("Invalid email or password.");
  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new AuthError("Invalid email or password.");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSessionCookie(user.id);
  await mergeGuestCartIntoUser(user.id);
  const session = await toSession(user.id);
  return session!;
}

export async function changePassword(userId: string, current: string, next: string) {
  if (!next || next.length < 6) throw new AuthError("New password must be at least 6 characters.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthError("Account not found.");
  const valid = await verifyPassword(current, user.passwordHash);
  if (!valid) throw new AuthError("Current password is incorrect.");
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
}
