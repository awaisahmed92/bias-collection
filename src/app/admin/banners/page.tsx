import { requireAuth } from "@/lib/auth-helpers";
import { listBanners } from "@/services/cms.service";
import BannersClient from "@/components/admin/BannersClient";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requireAuth();
  const banners = await listBanners();
  return <BannersClient banners={JSON.parse(JSON.stringify(banners))} />;
}
