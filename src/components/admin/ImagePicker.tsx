"use client";
import { useState } from "react";
import { Spinner } from "@/components/ui/primitives";

export default function ImagePicker({
  value,
  onChange,
  folder = "misc",
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      onChange(json.data.url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {label && <label className="admin-label">{label}</label>}
      <div className="flex items-center gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden border border-line bg-sand text-[9px] uppercase text-ink/30">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : "—"}
        </div>
        <div className="flex-1">
          <input
            className="admin-input"
            placeholder="https://… or /images/…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="mt-1.5 flex items-center gap-3">
            <label className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.12em] text-claydark hover:underline">
              {uploading ? <Spinner className="h-3 w-3" /> : "Upload file"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {error && <span className="text-xs text-rose-600">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
