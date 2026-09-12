import { getAdminDesk } from "@/lib/admin";
import { AdminView } from "@/components/AdminView";

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[]; storeId?: string | string[]; area?: string | string[] }>;
}) {
  const raw = await searchParams;
  const from = firstParam(raw.from)?.trim() || undefined;
  const to = firstParam(raw.to)?.trim() || undefined;
  const storeId = firstParam(raw.storeId)?.trim() || undefined;
  const area = firstParam(raw.area)?.trim() || undefined;
  const filters = { from, to, storeId, area };
  const desk = await getAdminDesk(filters);

  return (
    <AdminView
      customer={desk.customer}
      isAdmin={desk.isAdmin}
      stores={desk.stores}
      pendingStores={desk.pendingStores}
      orders={desk.orders}
      areas={desk.areas}
      stats={desk.stats}
      filters={desk.filters}
    />
  );
}
