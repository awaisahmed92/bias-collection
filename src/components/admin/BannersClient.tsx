"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ImagePicker from "./ImagePicker";
import { Spinner } from "@/components/ui/primitives";
import { cn, formatDate } from "@/lib/utils";

const POSITIONS = [
  ["HOME_HERO", "Homepage Hero"],
  ["HOME_MIDDLE", "Homepage Middle"],
  ["CATEGORY_PAGE", "Category Page"],
  ["PRODUCT_PAGE", "Product Page"],
  ["SALE_PAGE", "Sale Page"],
];

export default function BannersClient({ banners }: { banners: any[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<any | null>(null);
  const [state, setState] = useState<{ saving: boolean; error?: string }>({ saving: false });

  const toLocal = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 16) : "");

  const openNew = () =>
    setEditing({ title: "", subtitle: "", desktopImage: "", mobileImage: "", linkUrl: "", buttonText: "", position: "HOME_HERO", startDate: "", endDate: "", displayOrder: 0, isActive: true });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ saving: true });
    const res = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, startDate: editing.startDate || null, endDate: editing.endDate || null }),
    });
    const json = await res.json();
    if (!json.ok) return setState({ saving: false, error: json.error });
    setEditing(null);
    setState({ saving: false });
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await fetch(`/api/admin/banners?id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl">Banners</h1>
        <button className="admin-btn" onClick={openNew}>+ New Banner</button>
      </div>

      {state.error && <p className="mb-4 border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{state.error}</p>}

      {editing && (
        <form onSubmit={save} className="admin-card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className="admin-label">Title</label><input className="admin-input" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
          <div><label className="admin-label">Subtitle</label><input className="admin-input" value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></div>
          <div>
            <label className="admin-label">Position</label>
            <select className="admin-input" value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })}>
              {POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><label className="admin-label">Link URL</label><input className="admin-input" placeholder="/shop" value={editing.linkUrl ?? ""} onChange={(e) => setEditing({ ...editing, linkUrl: e.target.value })} /></div>
          <div><label className="admin-label">Button Text</label><input className="admin-input" value={editing.buttonText ?? ""} onChange={(e) => setEditing({ ...editing, buttonText: e.target.value })} /></div>
          <div><label className="admin-label">Display Order</label><input type="number" className="admin-input" value={editing.displayOrder} onChange={(e) => setEditing({ ...editing, displayOrder: Number(e.target.value) })} /></div>
          <div className="sm:col-span-2 lg:col-span-3">
            <ImagePicker label="Desktop Image *" value={editing.desktopImage ?? ""} onChange={(url) => setEditing({ ...editing, desktopImage: url })} folder="banners" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <ImagePicker label="Mobile Image (optional)" value={editing.mobileImage ?? ""} onChange={(url) => setEditing({ ...editing, mobileImage: url })} folder="banners" />
          </div>
          <div><label className="admin-label">Start</label><input type="datetime-local" className="admin-input" value={editing.startDate ?? ""} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} /></div>
          <div><label className="admin-label">End</label><input type="datetime-local" className="admin-input" value={editing.endDate ?? ""} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} /></div>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={editing.isActive ?? true} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Active</label>
          <div className="flex gap-3 sm:col-span-2 lg:col-span-3">
            <button disabled={state.saving} className="admin-btn">{state.saving ? <Spinner /> : editing.id ? "Save Changes" : "Create Banner"}</button>
            <button type="button" className="admin-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {banners.map((b) => (
          <div key={b.id} className="admin-card !p-0 overflow-hidden">
            <div className="relative h-44 bg-sand">
              {b.desktopImage && <img src={b.desktopImage} alt="" className="h-full w-full object-cover" />}
              <div className="absolute left-3 top-3 flex gap-1.5">
                <span className="badge bg-ink text-cream">{POSITIONS.find(([v]) => v === b.position)?.[1] ?? b.position}</span>
                <span className={cn("badge", b.live ? "bg-emerald-600 text-white" : "bg-white/90 text-ink/60")}>{b.live ? "LIVE" : "Inactive"}</span>
              </div>
            </div>
            <div className="p-4">
              <p className="font-semibold">{b.title || "(no title)"}</p>
              <p className="text-xs text-ink/50">{b.subtitle} {b.linkUrl ? `· → ${b.linkUrl}` : ""}</p>
              <p className="mt-1 text-xs text-ink/40">{b.startDate ? formatDate(b.startDate) : "Anytime"} → {b.endDate ? formatDate(b.endDate) : "No end"} · order {b.displayOrder}</p>
              <div className="mt-3 flex gap-3">
                <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline"
                  onClick={() => setEditing({ ...b, startDate: toLocal(b.startDate), endDate: toLocal(b.endDate) })}>Edit</button>
                <button className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700 hover:underline" onClick={() => remove(b.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {banners.length === 0 && <p className="text-sm text-ink/40">No banners yet.</p>}
      </div>
    </div>
  );
}
