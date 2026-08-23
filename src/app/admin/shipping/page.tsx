import { requireAuth } from "@/lib/auth-helpers";
import { listShippingMethods } from "@/services/shipping.service";
import ShippingClient from "@/components/admin/ShippingClient";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  await requireAuth();
  const methods = await listShippingMethods(false);
  return <ShippingClient methods={JSON.parse(JSON.stringify(methods))} />;
}
