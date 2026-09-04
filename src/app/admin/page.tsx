import { getAdminDesk } from "@/lib/admin";
import { AdminView } from "@/components/AdminView";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const desk = await getAdminDesk();

  return (
    <AdminView
      customer={desk.customer}
      isAdmin={desk.isAdmin}
      stores={desk.stores}
      pendingStores={desk.pendingStores}
      orders={desk.orders}
      areas={desk.areas}
    />
  );
}
