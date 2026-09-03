import fs from "node:fs";
import { getDb, query } from "../src/lib/db/client";
import { insertCustomer, findCustomerByPhone } from "../src/lib/db/customers";
import { insertOrder, findOrderById, findOrdersForCustomer } from "../src/lib/db/orders";

async function main() {
  const keepAlive = setInterval(() => undefined, 1000);
  try {
    await getDb();
    const stores = await query<{ n: number }>("select count(*)::int as n from public.stores");
    const products = await query<{ n: number }>("select count(*)::int as n from public.products");

    const customer = await insertCustomer({
      id: `cus_smoke_${Date.now()}`,
      name: "Smoke Tester",
      phone: `+234803${String(Date.now()).slice(-7)}`,
      email: "smoke@stillgood.ng",
      walletBalance: 0,
      createdAt: new Date().toISOString(),
    });
    const found = await findCustomerByPhone(customer.phone);
    const order = await insertOrder({
      id: `SG-${String(Math.floor(10000 + Math.random() * 90000))}`,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      items: [
        {
          productId: "sg_prod_001",
          productName: "Peak Full Cream Milk Powder (Refill Pack)",
          brand: "Peak Milk",
          unit: "850g Pouch",
          price: 5100,
          originalPrice: 8500,
          quantity: 1,
          image: "x",
          storeId: "store_grand_square",
          storeName: "Grand Square",
          expiryDate: "2026-09-12",
        },
      ],
      storeId: "store_grand_square",
      storeName: "Grand Square Supermarket & Bakery",
      storeAddress: "Plot 272",
      storeArea: "Central Area",
      subtotal: 5100,
      platformFee: 150,
      savingsTotal: 3400,
      total: 5250,
      status: "confirmed",
      paymentMethod: "paystack",
      paymentReference: "ref_smoke",
      pickupDate: "2026-09-03",
      pickupTimeSlot: "4:00 PM – 7:00 PM",
      pickupVerificationCode: "1234",
      requiresConsolidation: false,
      originStores: [{ id: "store_grand_square", name: "Grand Square", area: "Central Area" }],
      hubBatch: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const loaded = await findOrderById(order.id);
    const listed = await findOrdersForCustomer({ customerId: customer.id, phone: customer.phone });
    const report = {
      stores: stores[0],
      products: products[0],
      customer: found?.id,
      order: loaded?.id,
      items: loaded?.items.length,
      origins: loaded?.originStores,
      listed: listed.length,
    };
    console.error(JSON.stringify(report));
    fs.writeFileSync("/tmp/stillgood-db-smoke.json", JSON.stringify(report, null, 2));
    if (!loaded?.id || Number(stores[0]?.n) < 6) {
      throw new Error("Smoke assertions failed");
    }
  } finally {
    clearInterval(keepAlive);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("SMOKE FAILED", err);
    process.exit(1);
  });
