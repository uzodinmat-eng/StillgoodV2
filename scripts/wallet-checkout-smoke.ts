/**
 * One-off verification for the wallet checkout slice:
 * 1. insertProduct with ONLY currentPrice (no original price/markdown)
 * 2. calculateWalletDiscount maths
 * 3. markWalletPaymentSuccessful settles the order and writes the ledger
 * 4. decide_store_order_item still refunds into the customer wallet
 * Run: npx tsx scripts/wallet-checkout-smoke.ts
 */
import { insertProduct } from "../src/lib/db/products";
import { calculateWalletDiscount, calculatePickupFee } from "../src/lib/fees";
import { createOrderPayment, markWalletPaymentSuccessful } from "../src/lib/db/payments";
import { execute, query, queryOne } from "../src/lib/db/client";
import { findOrderById } from "../src/lib/db/orders";
import { findCustomerByEmail, insertCustomer } from "../src/lib/db/customers";

async function main() {
  const stamp = Date.now();

  // 1. Product with only a current price
  const product = await insertProduct({
    storeId: "store_grand_square",
    name: `Wallet Check Rice ${stamp}`,
    brand: "Check Brand",
    category: "cat_pantry",
    description: "current-price-only listing",
    unit: "1kg",
    images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80"],
    currentPrice: 1234,
    dateType: "best_before",
    expiryDate: "2026-12-01",
    stockQuantity: 4,
    storageCondition: "ambient",
  });
  console.log("product currentPrice-only:", product.currentPrice, "(expect 1234), discount:", product.discountPercent, "(expect 0)");

  // 2. Fee maths
  const d1 = calculateWalletDiscount(1);
  const d3 = calculateWalletDiscount(3);
  console.log("wallet discount 1 store:", d1, "(expect 800); 3 stores:", d3, "(expect 800)");
  console.log("pickup fee 1 store:", calculatePickupFee(1), "(expect 800); 3 stores:", calculatePickupFee(3), "(expect 1800)");

  // 3. Wallet-paid order settles without a gateway
  let customer = await findCustomerByEmail(`walletcheck_${stamp}@example.test`);
  if (!customer) {
    customer = await insertCustomer({
      id: `cus_walletcheck_${stamp}`,
      name: "Wallet Checker",
      phone: `+23480${String(stamp).slice(-8)}`,
      email: `walletcheck_${stamp}@example.test`,
      walletBalance: 100000,
      createdAt: new Date().toISOString(),
    });
  }
  const orderId = `SG-${String(stamp).slice(-5)}`;
  await execute(
    `insert into public.orders (id, customer_id, customer_name, customer_email, customer_phone,
      store_id, store_name, store_address, store_area, subtotal, platform_fee, pickup_fee,
      savings_total, total, status, payment_method, payment_reference, pickup_date,
      pickup_time_slot, pickup_verification_code, created_at, updated_at)
     values ($1,$2,'Wallet Checker',$3,'+2348000000000','store_grand_square','Grand Square','x','Central Area',
      1234, -800, 800, 0, 1234, 'pending_payment', 'wallet', 'ref_walletcheck', current_date,
      '4:00 PM – 7:00 PM', '1234', now(), now())`,
    [orderId, customer.id, customer.email]
  );
  await execute(
    `insert into public.order_items (id, order_id, product_id, product_name, brand, unit, price,
      original_price, quantity, image_url, store_id, store_name, expiry_date, sort_index)
     values ($1, $2, $3, 'Wallet Check Rice', 'Check Brand', '1kg', 1234, 0, 1, '', 'store_grand_square', 'Grand Square', '2026-12-01', 0)`,
    [`oi_${orderId}_1`, orderId, product.id]
  );

  const paymentId = `pay_${orderId}`;
  await createOrderPayment({ id: paymentId, orderId, amount: 1234, reference: `ref_wc_${stamp}` });
  await markWalletPaymentSuccessful(paymentId, 1234, orderId);

  const order = await findOrderById(orderId);
  console.log("order status:", order?.status, "(expect awaiting_store_confirmation)");
  const payment = await queryOne<{ status: string }>(`select status from public.order_payments where id = $1`, [paymentId]);
  console.log("payment status:", payment?.status, "(expect success)");
  const ledger = await query<{ wallet_id: string; amount: number; kind: string }>(
    `select wallet_id, amount, kind from public.ledger_entries where ref_id = $1 order by id`,
    [paymentId]
  );
  console.log("ledger rows:", ledger.map((r) => `${r.wallet_id}:${r.amount}:${r.kind}`).join(", "));
  const walletAfter = await queryOne<{ wallet_balance: number }>(`select wallet_balance from public.customers where id = $1`, [customer.id]);
  console.log("wallet after (via ledger credit expectation):", walletAfter?.wallet_balance, "(debitWallet in app path; direct DB test leaves 100000 + manual debit skipped)");

  // 4. Unavailable decision refunds into the customer wallet
  await execute(`select public.decide_store_order_item($1, 'store_grand_square', $2, false)`, [orderId, product.id]);
  const walletAfterRefund = await queryOne<{ wallet_balance: number }>(`select wallet_balance from public.customers where id = $1`, [customer.id]);
  console.log("wallet after unavailable decision:", walletAfterRefund?.wallet_balance, "(expect 100000 + 1234 = 101234)");

  // Cleanup
  await execute(`delete from public.orders where id = $1`, [orderId]);
  await execute(`delete from public.products where id = $1`, [product.id]);
  await execute(`delete from public.customers where id = $1`, [customer.id]);
  console.log("cleanup done");
}

main().catch(async (error) => {
  console.error("WALLET CHECK FAILED", error);
  process.exit(1);
});
