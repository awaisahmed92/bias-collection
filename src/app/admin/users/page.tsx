import { requireAuth } from "@/lib/auth-helpers";
import prisma from "@/lib/db";
import UsersClient from "@/components/admin/UsersClient";
import { PERMISSION_GROUPS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await requireAuth();
  const [staff, roles] = await Promise.all([
    prisma.user.findMany({
      where: { role: { name: { not: "customer" } } },
      include: { role: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: "asc" } }),
  ]);
  return (
    <UsersClient
      staff={JSON.parse(JSON.stringify(staff.map(({ passwordHash, ...u }) => u)))}
      roles={JSON.parse(JSON.stringify(roles.map((r) => ({ id: r.id, name: r.name, label: r.label, permissions: r.permissions.map((p) => p.permission.key) }))))}
      allPermissions={PERMISSION_GROUPS}
      meId={session.id}
    />
  );
}
