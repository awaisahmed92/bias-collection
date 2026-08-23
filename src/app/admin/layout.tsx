import { redirect } from "next/navigation";
import { getSession, isStaff } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!isStaff(session)) redirect("/");
  return (
    <AdminShell
      user={{ name: `${session.firstName} ${session.lastName}`, email: session.email, role: session.roleLabel, permissions: session.role === "super_admin" ? ["*"] : session.permissions }}
      notifications={[]}
    >
      {children}
    </AdminShell>
  );
}
