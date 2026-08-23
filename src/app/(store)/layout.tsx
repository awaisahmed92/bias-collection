import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import { listCategories } from "@/services/category.service";
import { getSession } from "@/lib/auth";
import { getAllSettings } from "@/services/settings.service";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, session, settings] = await Promise.all([
    listCategories(false),
    getSession(),
    getAllSettings(),
  ]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          children: c.children.map((s) => ({ name: s.name, slug: s.slug })),
        }))}
        initialUser={session ? { firstName: session.firstName, lastName: session.lastName, email: session.email, role: session.role } : null}
        announcement={settings.announcement}
      />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
    </div>
  );
}
