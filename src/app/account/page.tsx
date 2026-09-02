import { getAccount } from "@/lib/auth";
import { AccountView } from "@/components/AccountView";

export default async function AccountPage() {
  const account = await getAccount();

  return (
    <AccountView
      initialCustomer={account.customer}
      initialOrders={account.orders}
      initialSavingsTotal={account.savingsTotal}
    />
  );
}
