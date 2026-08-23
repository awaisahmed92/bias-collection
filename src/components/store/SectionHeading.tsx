import Link from "next/link";
import { IconArrowRight } from "@/components/ui/icons";

export default function SectionHeading({
  title,
  subtitle,
  linkHref,
  linkText,
}: {
  title?: string | null;
  subtitle?: string | null;
  linkHref?: string | null;
  linkText?: string | null;
}) {
  if (!title && !subtitle) return null;
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        {title ? <h2 className="font-serif text-3xl font-medium tracking-wide sm:text-4xl">{title}</h2> : null}
        {subtitle ? <p className="mt-2 text-sm text-ink/50">{subtitle}</p> : null}
      </div>
      {linkHref && linkText ? (
        <Link href={linkHref} className="group hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ink/70 hover:text-ink sm:inline-flex">
          {linkText}
          <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      ) : null}
    </div>
  );
}
