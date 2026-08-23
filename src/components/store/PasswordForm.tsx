"use client";
import { useState } from "react";
import { Spinner } from "@/components/ui/primitives";

export default function PasswordForm() {
  const [state, setState] = useState<{ loading: boolean; message?: string; error?: string }>({ loading: false });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("newPassword") !== fd.get("confirm")) return setState({ loading: false, error: "New passwords do not match." });
    setState({ loading: true });
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: fd.get("currentPassword"), newPassword: fd.get("newPassword") }),
    });
    const json = await res.json();
    if (json.ok) {
      setState({ loading: false, message: "Password updated successfully." });
      e.currentTarget.reset();
    } else setState({ loading: false, error: json.error });
  };

  return (
    <form onSubmit={submit} className="card max-w-md space-y-4 p-6">
      <h3 className="font-serif text-lg">Change Password</h3>
      <div><label className="label">Current Password</label><input name="currentPassword" type="password" required className="input" /></div>
      <div><label className="label">New Password</label><input name="newPassword" type="password" required minLength={6} className="input" /></div>
      <div><label className="label">Confirm New Password</label><input name="confirm" type="password" required className="input" /></div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <button disabled={state.loading} className="btn-primary btn-sm">{state.loading ? <Spinner /> : "Update Password"}</button>
    </form>
  );
}
