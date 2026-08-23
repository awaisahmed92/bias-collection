import { requireAuth } from "@/lib/auth-helpers";
import { getAllSettings } from "@/services/settings.service";
import SettingsClient from "@/components/admin/SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAuth();
  const settings = await getAllSettings();
  return <SettingsClient settings={settings} />;
}
