import { requireAuth } from "@/lib/auth-helpers";
import { inventoryOverview, inventoryLogs, lowStockList } from "@/services/inventory.service";
import InventoryClient from "@/components/admin/InventoryClient";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage({ searchParams }: { searchParams: Record<string, string> }) {
  await requireAuth();
  const [overview, lowStock, logs] = await Promise.all([
    inventoryOverview({ q: searchParams.q, page: searchParams.page ? Number(searchParams.page) : 1 }),
    lowStockList(),
    inventoryLogs({ page: searchParams.logPage ? Number(searchParams.logPage) : 1 }),
  ]);
  return (
    <InventoryClient
      overview={JSON.parse(JSON.stringify(overview))}
      lowStock={JSON.parse(JSON.stringify(lowStock))}
      logs={JSON.parse(JSON.stringify(logs))}
      searchParams={searchParams}
    />
  );
}
