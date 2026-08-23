import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AccountNav from "@/components/store/AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  return (
    <div className="container-x py-10">
      <h1 className="font-serif text-4xl font-medium">My Account</h1>
      <p className="mt-1 text-sm text-ink/50">{session.firstName} {session.lastName} · {session.email}</p>
      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
        <AccountNav role={session.role} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
