import { execute, queryOne } from "./client";

export async function createOrderPayment(input: {
  id: string;
  orderId: string;
  amount: number;
  reference: string;
}): Promise<void> {
  await execute(
    `insert into public.order_payments (id, order_id, amount, gateway_ref)
     values ($1, $2, $3, $4)`,
    [input.id, input.orderId, input.amount, input.reference]
  );
}

export async function markPaystackPaymentSuccessful(reference: string, amountNaira: number): Promise<boolean> {
  const payment = await queryOne<{ id: string; order_id: string; amount: number | string; status: string }>(
    `select id, order_id, amount, status from public.order_payments where gateway_ref = $1 for update`,
    [reference]
  );
  if (!payment) return false;
  if (payment.status === "success") return true;
  if (Number(payment.amount) !== amountNaira) throw new Error("Paystack amount does not match order payment");

  const txnId = `txn_paystack_${reference}`;
  await execute(
    `update public.order_payments set status = 'success', paid_at = now(), updated_at = now() where id = $1;
     update public.orders set status = 'confirmed', payment_reference = $2, updated_at = now() where id = $3 and status = 'pending_payment';
     insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
       values ($4, 'wallet_gateway_paystack', -$5, 'payment_in', 'order_payment', $1, 'Verified Paystack charge'),
              ($4, 'wallet_platform', $5, 'payment_in', 'order_payment', $1, 'Verified Paystack charge')
       on conflict (txn_id, wallet_id, kind) do nothing`,
    [payment.id, reference, payment.order_id, txnId, amountNaira]
  );
  return true;
}
