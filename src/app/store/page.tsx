import { getStorePortalData } from "@/lib/store";
import { StorePortalView } from "@/components/StorePortalView";

export const dynamic = "force-dynamic";

export default async function StorePortalPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  const { storeId } = await searchParams;
  const data = await getStorePortalData(storeId);

  return (
    <StorePortalView
      customer={data.customer}
      store={data.store}
      products={data.products}
      orders={data.orders}
      categories={data.categories}
      allStores={data.allStores}
      error={data.error}
    />
  );
}
