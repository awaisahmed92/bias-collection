"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/primitives";
import { cn, formatDate } from "@/lib/utils";

export default function UsersClient({ staff, roles, allPermissions, meId }: { staff: any[]; roles: any[]; allPermissions: { group: string; keys: string[] }[]; meId: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changeRole = async (userId: string, roleName: string) => {
    setBusy(userId);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, roleName }),
    });
    setBusy(null);
    router.refresh();
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    setBusy(userId);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isActive }),
    });
    setBusy(null);
    router.refresh();
  };

  const addStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setBusy("new");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: fd.get("firstName"),
        lastName: fd.get("lastName"),
        email: fd.get("email"),
        password: fd.get("password"),
        roleName: fd.get("roleName"),
      }),
    });
    const json = await res.json();
    setBusy(null);
    if (!json.ok) return setError(json.error);
    setAdding(false);
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Users & Roles</h1>
        <button className="admin-btn" onClick={() => setAdding(!adding)}>+ Add Staff</button>
      </div>

      {adding && (
        <form onSubmit={addStaff} className="admin-card grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div><label className="admin-label">First Name</label><input name="firstName" required className="admin-input" /></div>
          <div><label className="admin-label">Last Name</label><input name="lastName" required className="admin-input" /></div>
          <div><label className="admin-label">Email</label><input name="email" type="email" required className="admin-input" /></div>
          <div><label className="admin-label">Password</label><input name="password" type="password" required minLength={8} className="admin-input" /></div>
          <div>
            <label className="admin-label">Role</label>
            <select name="roleName" className="admin-input">
              {roles.filter((r) => r.name !== "customer").map((r) => <option key={r.name} value={r.name}>{r.label}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-rose-600 sm:col-span-2 lg:col-span-5">{error}</p>}
          <div className="flex gap-3 sm:col-span-2 lg:col-span-5">
            <button disabled={busy === "new"} className="admin-btn">{busy === "new" ? <Spinner /> : "Create Staff Account"}</button>
            <button type="button" className="admin-btn-outline" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admin-card overflow-x-auto p-0">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-line bg-off">
              <th className="admin-th">Staff Member</th><th className="admin-th">Role</th><th className="admin-th">Joined</th>
              <th className="admin-th">Status</th><th className="admin-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {staff.map((u) => (
              <tr key={u.id} className={cn("hover:bg-off/50", !u.isActive && "opacity-55")}>
                <td className="admin-td">
                  <p className="font-semibold">{u.firstName} {u.lastName} {u.id === meId && <span className="text-xs text-claydark">(you)</span>}</p>
                  <p className="text-xs text-ink/40">{u.email}</p>
                </td>
                <td className="admin-td">
                  <select
                    className="admin-input !w-44 !py-1.5"
                    value={u.role.name}
                    disabled={u.id === meId || busy === u.id}
                    onChange={(e) => { if (confirm(`Change ${u.firstName}'s role to ${e.target.value}?`)) changeRole(u.id, e.target.value); }}
                  >
                    {roles.filter((r) => r.name !== "customer").map((r) => <option key={r.name} value={r.name}>{r.label}</option>)}
                  </select>
                </td>
                <td className="admin-td text-ink/60">{formatDate(u.createdAt)}</td>
                <td className="admin-td"><span className={cn("badge", u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500")}>{u.isActive ? "Active" : "Disabled"}</span></td>
                <td className="admin-td text-right">
                  {u.id !== meId && (
                    <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700 hover:underline" onClick={() => toggleActive(u.id, !u.isActive)}>
                      {busy === u.id ? "…" : u.isActive ? "Disable" : "Enable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* permission matrix */}
      <div>
        <h2 className="mb-4 font-serif text-2xl">Role Permission Matrix</h2>
        <div className="admin-card overflow-x-auto p-0">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-line bg-off">
                <th className="admin-th">Permission</th>
                {roles.filter((r) => r.name !== "customer").map((r) => <th key={r.name} className="admin-th text-center">{r.label}</th>)}
                <th className="admin-th text-center">Customer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {allPermissions.map((g) =>
                g.keys.map((k, i) => (
                  <tr key={k} className="hover:bg-off/50">
                    <td className="admin-td font-mono text-xs">
                      {i === 0 && <span className="mr-2 font-sans font-bold text-ink/30">{g.group}</span>}{k}
                    </td>
                    {roles.filter((r) => r.name !== "customer").map((r) => {
                      const has = r.name === "super_admin" || r.permissions.includes(k);
                      return (
                        <td key={r.name} className="admin-td text-center">
                          <span className={has ? "font-bold text-emerald-700" : "text-ink/20"}>{has ? "✓" : "—"}</span>
                        </td>
                      );
                    })}
                    <td className="admin-td text-center text-ink/20">—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
