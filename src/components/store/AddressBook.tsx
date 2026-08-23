"use client";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Address = {
  id: string; label: string; firstName: string; lastName: string; phone: string;
  country: string; city: string; area: string; address: string; postalCode: string | null; isDefault: boolean;
};

const empty: Omit<Address, "id"> & { id?: string } = {
  label: "Home", firstName: "", lastName: "", phone: "", country: "Pakistan", city: "", area: "", address: "", postalCode: "", isDefault: false,
};

export default function AddressBook() {
  const [items, setItems] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<(typeof empty) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/account/addresses");
    const json = await res.json();
    setItems(json?.data?.addresses ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/account/addresses", {
      method: editing.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.ok) return setError(json.error);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    await fetch(`/api/account/addresses?id=${id}`, { method: "DELETE" });
    load();
  };

  if (items === null) return <div className="grid place-items-center py-16"><Spinner className="h-6 w-6" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">Saved Addresses</h2>
        <button className="btn-outline btn-sm" onClick={() => setEditing({ ...empty })}>+ Add Address</button>
      </div>

      {editing && (
        <form onSubmit={save} className="card mt-5 grid gap-4 p-5 sm:grid-cols-2">
          <div><label className="label">Label</label><input className="input" value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></div>
          <div><label className="label">Phone</label><input required className="input" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
          <div><label className="label">First Name</label><input required className="input" value={editing.firstName} onChange={(e) => setEditing({ ...editing, firstName: e.target.value })} /></div>
          <div><label className="label">Last Name</label><input required className="input" value={editing.lastName} onChange={(e) => setEditing({ ...editing, lastName: e.target.value })} /></div>
          <div><label className="label">City</label><input required className="input" value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
          <div><label className="label">Area</label><input required className="input" value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Street Address</label><input required className="input" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
          <div><label className="label">Postal Code</label><input className="input" value={editing.postalCode ?? ""} onChange={(e) => setEditing({ ...editing, postalCode: e.target.value })} /></div>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} /> Set as default</label>
          {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
          <div className="flex gap-3 sm:col-span-2">
            <button disabled={saving} className="btn-primary btn-sm">{saving ? <Spinner /> : editing.id ? "Save Changes" : "Add Address"}</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {items.map((a) => (
          <div key={a.id} className={cn("card p-5", a.isDefault && "border-claydark")}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/60">{a.label}</p>
              {a.isDefault && <span className="badge bg-claydark text-cream">Default</span>}
            </div>
            <p className="mt-2 text-sm font-semibold">{a.firstName} {a.lastName}</p>
            <p className="mt-1 text-sm text-ink/60">{a.address}, {a.area}, {a.city}{a.postalCode ? ` ${a.postalCode}` : ""}</p>
            <p className="text-sm text-ink/60">{a.phone}</p>
            <div className="mt-3 flex gap-4 text-[11px] font-bold uppercase tracking-[0.12em]">
              <button className="text-claydark hover:underline" onClick={() => setEditing(a)}>Edit</button>
              <button className="text-rose-700 hover:underline" onClick={() => remove(a.id)}>Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && !editing && <p className="text-sm text-ink/50">No saved addresses yet — add one for faster checkout.</p>}
      </div>
    </div>
  );
}
