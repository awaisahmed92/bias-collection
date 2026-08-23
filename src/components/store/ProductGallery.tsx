"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function ProductGallery({ images, badges }: { images: { url: string; alt?: string | null }[]; badges?: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const imgs = images.length ? images : [{ url: "", alt: "" }];
  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        {imgs[active]?.url ? (
          <img src={imgs[active].url} alt={imgs[active].alt || "Product image"} className="h-full w-full object-cover fade-in" key={active} />
        ) : (
          <div className="grid h-full place-items-center text-[10px] uppercase tracking-[0.3em] text-ink/30">Bias Collection</div>
        )}
        {badges && <div className="absolute left-4 top-4 flex flex-col items-start gap-1.5">{badges}</div>}
      </div>
      {imgs.length > 1 && (
        <div className="mt-3 flex gap-3">
          {imgs.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn("aspect-square w-20 overflow-hidden border bg-sand transition-colors", i === active ? "border-ink" : "border-line hover:border-ink/40")}
            >
              {img.url && <img src={img.url} alt="" className="h-full w-full object-cover" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
