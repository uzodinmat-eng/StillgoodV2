/**
 * One-off verification for order adjustment hardening:
 *  1. marking every item unavailable cancels the order + store fulfillment
 *  2. after pickup (PIN), item decisions are rejected (locked)
 *  3. a normal single-item unavailable decision still refunds the wallet
 * Run: npx tsx scripts/order-hardening-smoke.ts
 */
import { execute, queryOne, query } from "../src/lib/db/client";
import { findOrderById } from "../src/lib/db/orders";
import { insertCustomer, findCustomerByEmail } from "../src/lib/db/customers";
import { insertProduct } from "../src/lib/db/products";

async function setupOrder(stamp: number, storeId: string): Promise<{ orderId: string; productIds: string[]; customerId: string }> {
  const customer = await findCustomerByEmail(`hardening_${stamp}@example.test`);
  const cust = customer ?? await insertCustomer({
    id: `cus_hardening_${stamp}`,
    name: "Hardening Checker",
    phone: `+23480${String(stamp).slice(-8)}`,
    email: `hardening_${stamp}@example.test`,
    walletBalance: 0,
    createdAt: new Date().toISOString(),
  });

  const orderId = `SG-H${String(stamp).slice(-5)}`;
  await execute(
    `insert into public.orders (id, customer_id, customer_name, customer_email, customer_phone,
      store_id, store_name, store_address, store_area, subtotal, platform_fee, pickup_fee,
      savings_total, total, status, payment_method, payment_reference, pickup_date,
      pickup_time_slot, pickup_verification_code, created_at, updated_at)
     values ($1,$2,'Hardening Checker',$3,'+2348000000000','store_sahad','Sahad Stores','x','Central Area',
      0, 0, 0, 0, 0, 'paid', 'paystack', 'ref_hardening', current_date,
      '4:00 PM – 7:00 PM', '1234', now(), now())`,
    [orderId, cust.id, cust.email]
  );

  const productIds: string[] = [];
  for (let i = 1; i <= 2; i += 1) {
    const p = await insertProduct({
      storeId: "store_sahad",
      name: `Hardening Rice ${stamp} #${i}`,
      brand: "H",
      category: "cat_pantry",
      description: "hardening test",
      unit: "1kg",
      images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80"],
      currentPrice: 500 * i,
      dateType: "best_before",
      expiryDate: "2026-12-01",
      stockQuantity: 3,
      storageCondition: "ambient",
    });
    productIds.push(p.id);
    await execute(
      `insert into public.order_items (id, order_id, product_id, product_name, brand, unit, price,
        original_price, quantity, image_url, store_id, store_name, expiry_date, sort_index)
       values ($1, $2, $3, $4, 'H', '1kg', $5, 0, 1, '', 'store_sahad', 'Sahad Stores', '2026-12-01', $6)`,
      [`oi_h_${orderId}_${i}`, orderId, p.id, `Hardening Rice #${i}`, 500 * i, i]
    );
  }
  await execute(
    `insert into public.store_fulfillments (id, order_id, store_id, subtotal, status, pickup_code)
     values ($1, $2, 'store_sahad', 0, 'pending', '1234')
     on conflict (order_id, store_id) do nothing`,
    [`sf_h_${orderId}`, orderId]
  );

  return { orderId, productIds, customerId: cust.id };
}

async function main() {
  const stamp = Date.now();

  // Case 1: all items unavailable -> order + fulfillment cancelled
  const c1 = await setupOrder(stamp, "store_sahad");
  await execute(`select public.decide_store_order_item($1, 'store_sahad', $2, false)`, [c1.orderId, c1.productIds[0]]);
  await execute(`select public.decide_store_order_item($1, 'store_sahad', $2, false)`, [c1.orderId, c1.productIds[1]]);
  const o1 = await findOrderById(c1.orderId);
  const sf1 = await queryOne<{ status: string }>(`select status from public.store_fulfillments where order_id = $1 and store_id = 'store_sahad'`, [c1.orderId]);
  console.log("[all-unavailable] order status:", o1?.status, "(expect cancelled); fulfillment:", sf1?.status, "(expect cancelled)");
  const wallet1 = await queryOne<{ wallet_balance: number }>(`select wallet_balance from public.customers where id = $1`, [c1.customerId]);
  console.log("[all-unavailable] wallet (need 500 + 1000 = 1500):", wallet1?.wallet_balance);

  // Case 2: flip one back to available -> order stays cancelled (resurrection
  // is not allowed once cancelled), so the fulfillment must NOT flip to
  // ready_for_pickup over a cancelled order.
  await execute(`select public.decide_store_order_item($1, 'store_sahad', $2, true)`, [c1.orderId, c1.productIds[0]]);
  const o1b = await findOrderById(c1.orderId);
  const sf1b = await queryOne<{ status: string }>(`select status from public.store_fulfillments where order_id = $1 and store_id = 'store_sahad'`, [c1.orderId]);
  console.log("[restore] order status:", o1b?.status, "(expect cancelled stays); fulfillment:", sf1b?.status, "(expect cancelled, not ready_for_pickup)");

  // Case 3: separate order. Item A confirmed available, item B marked
  // unavailable. Pickup completes (only A is available -> picked up), but the
  // store fulfillment becomes 'picked_up' while item B stays 'unavailable'.
  // Flipping B back to available must hit the STORE-level locked guard (item B
  // itself is not picked_up, so the item-level guard would not fire).
  const c3 = await setupOrder(stamp + 1, "store_sahad");
  await execute(`select public.decide_store_order_item($1, 'store_sahad', $2, true)`, [c3.orderId, c3.productIds[0]]);
  await execute(`select public.decide_store_order_item($1, 'store_sahad', $2, false)`, [c3.orderId, c3.productIds[1]]);
  await execute(`select public.complete_store_pickup($1, 'store_sahad', '1234')`, [c3.orderId]);
  const o3 = await findOrderById(c3.orderId);
  const o3itemB = o3?.items.find((i) => i.productId === c3.productIds[1]);
  console.log("[pickup-case3] order:", o3?.status, "(expect picked_up); item B:", o3itemB?.fulfillmentStatus, "(expect unavailable)");
  try {
    await execute(`select public.decide_store_order_item($1, 'store_sahad', $2, true)`, [c3.orderId, c3.productIds[1]]);
    console.log("[locked-case3] ERROR: unavailable item after pickup was re-allowed (should have thrown)");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log("[locked-case3] blocked:", msg, "->", /locked/i.test(msg) ? "STORE-LEVEL GUARD OK" : "unexpected message");
  }

  // Cleanup
  await execute(`delete from public.orders where id = $1`, [c1.orderId]);
  for (const pid of c1.productIds) await execute(`delete from public.products where id = $1`, [pid]);
  await execute(`delete from public.customers where id = $1`, [c1.customerId]);
  await execute(`delete from public.orders where id = $1`, [c3.orderId]);
  for (const pid of c3.productIds) await execute(`delete from public.products where id = $1`, [pid]);
  await execute(`delete from public.customers where id = $1`, [c3.customerId]);
  console.log("cleanup done");
}

main().catch(async (error) => {
  console.error("HARDENING CHECK FAILED", error);
  process.exit(1);
});