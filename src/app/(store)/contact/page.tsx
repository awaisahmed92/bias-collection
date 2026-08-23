import ContactForm from "@/components/store/ContactForm";
import { getAllSettings } from "@/services/settings.service";

export const metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const settings = await getAllSettings();
  return (
    <div className="container-x py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink/40">We reply fast</p>
          <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">Contact Us</h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/60">
            Questions about sizing, an order, or wholesale? Write to us — a human replies within 24 hours.
          </p>
          <div className="mt-8 space-y-3 text-sm text-ink/70">
            <p><span className="font-semibold text-ink">Email:</span> {settings.storeEmail}</p>
            <p><span className="font-semibold text-ink">Phone / WhatsApp:</span> {settings.storePhone}</p>
            <p><span className="font-semibold text-ink">Studio:</span> {settings.storeAddress}</p>
          </div>
        </div>
        <div className="card p-6 sm:p-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
