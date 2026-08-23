import { z } from "zod";
import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import prisma from "@/lib/db";

export const GET = handle(async () => {
  const auth = await requirePermission("users.manage");
  if ("response" in auth) return auth.response;
  const [staff, roles] = await Promise.all([
    prisma.user.findMany({
      where: { role: { name: { not: "customer" } } },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ include: { permissions: { include: { permission: true } } } }),
  ]);
  return ok({
    staff: staff.map(({ passwordHash, ...u }) => u),
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      label: r.label,
      permissions: r.permissions.map((p) => p.permission.key),
    })),
  });
});

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Min 8 chars for staff accounts"),
  roleName: z.string().min(1),
});

export const POST = handle(async (req: Request) => {
  const auth = await requirePermission("users.manage");
  if ("response" in auth) return auth.response;
  const input = createSchema.parse(await req.json());
  const email = input.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return fail("Email already in use.");
  const role = await prisma.role.findUnique({ where: { name: input.roleName } });
  if (!role) return fail("Role not found.");
  if (role.name === "customer") return fail("Use the storefront to register customers.");
  const user = await prisma.user.create({
    data: {
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: await hashPassword(input.password),
      roleId: role.id,
    },
  });
  await audit(auth.session.id, "create", "staff_user", user.id, `${email} (${role.name})`);
  return ok({ user: { id: user.id, email: user.email } });
});

export const PATCH = handle(async (req: Request) => {
  const auth = await requirePermission("users.manage");
  if ("response" in auth) return auth.response;
  const { userId, roleName, isActive } = await req.json();
  if (!userId) return fail("userId required");
  if (userId === auth.session.id) return fail("You cannot change your own account.");
  const data: any = {};
  if (roleName) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return fail("Role not found.");
    data.roleId = role.id;
  }
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  const user = await prisma.user.update({ where: { id: userId }, data });
  await audit(auth.session.id, "update", "staff_user", userId, JSON.stringify(data));
  return ok({ user: { id: user.id } });
});
