import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PasswordForm from "@/components/store/PasswordForm";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div className="space-y-8">
      <div className="card max-w-md p-6">
        <h3 className="font-serif text-lg">Profile</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-ink/50">Name</dt><dd className="font-medium">{session.firstName} {session.lastName}</dd></div>
          <div className="flex justify-between"><dt className="text-ink/50">Email</dt><dd className="font-medium">{session.email}</dd></div>
          <div className="flex justify-between"><dt className="text-ink/50">Account type</dt><dd className="font-medium">{session.roleLabel}</dd></div>
        </dl>
      </div>
      <PasswordForm />
    </div>
  );
}
