import { requireAuth } from "@/lib/auth-helpers";
import prisma from "@/lib/db";
import { formatDateTime, cn } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({ searchParams }: { searchParams: Record<string, string> }) {
  await requireAuth();
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const limit = 40;
  const [total, items] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl">Audit Log</h1>
      <div className="admin-card overflow-x-auto p-0">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-line bg-off">
              <th className="admin-th">When</th><th className="admin-th">User</th><th className="admin-th">Action</th>
              <th className="admin-th">Entity</th><th className="admin-th">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((l) => (
              <tr key={l.id}>
                <td className="admin-td text-ink/60">{formatDateTime(l.createdAt)}</td>
                <td className="admin-td">{l.user ? `${l.user.firstName} ${l.user.lastName}` : "System"}</td>
                <td className="admin-td"><span className="badge bg-slate-100 text-slate-700">{l.action}</span></td>
                <td className="admin-td capitalize">{l.entity}</td>
                <td className="admin-td text-xs text-ink/50">{l.details ?? "—"}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="admin-td py-10 text-center text-ink/40">No audit events yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4 flex gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <Link key={i} href={`/admin/audit?page=${i + 1}`} className={cn("border px-3 py-1.5 text-xs font-semibold", page === i + 1 ? "border-ink bg-ink text-cream" : "border-line bg-white")}>
              {i + 1}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
