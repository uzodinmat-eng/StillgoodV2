import { asInt, execute, isoTimestamp, query } from "./client";

export type ManualRefundStatus = "pending" | "sent" | "rejected";

export interface ManualItemRefund {
  id: string;
  orderId: string;
  orderItemId: string;
  customerId: string;
  customerName?: string;
  productName: string;
  quantity: number;
  amount: number;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  resolvedAccountName: string;
  status: ManualRefundStatus;
  unavailableAt: string;
  pickupFinalizedAt: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ManualRefundRow {
  id: string;
  order_id: string;
  order_item_id: string;
  customer_id: string;
  customer_name?: string | null;
  product_name: string;
  quantity: number | string;
  amount: number | string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  resolved_account_name: string;
  status: ManualRefundStatus;
  unavailable_at: Date | string;
  pickup_finalized_at: Date | string;
  sent_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const MANUAL_COLUMNS = `m.id, m.order_id, m.order_item_id, m.customer_id, c.name as customer_name, m.product_name, m.quantity, m.amount, m.bank_code, m.bank_name, m.account_number, m.account_name, m.resolved_account_name, m.status, m.unavailable_at, m.pickup_finalized_at, m.sent_at, m.created_at, m.updated_at`;

function hydrate(row: ManualRefundRow): ManualItemRefund {
  return {
    id: row.id,
    orderId: row.order_id,
    orderItemId: row.order_item_id,
    customerId: row.customer_id,
    customerName: row.customer_name || undefined,
    productName: row.product_name,
    quantity: asInt(row.quantity),
    amount: asInt(row.amount),
    bankCode: row.bank_code,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountName: row.account_name,
    resolvedAccountName: row.resolved_account_name,
    status: row.status,
    unavailableAt: isoTimestamp(row.unavailable_at),
    pickupFinalizedAt: isoTimestamp(row.pickup_finalized_at),
    sentAt: row.sent_at ? isoTimestamp(row.sent_at) : null,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
  };
}

export async function listManualRefunds(status: ManualRefundStatus): Promise<ManualItemRefund[]> {
  const rows = await query<ManualRefundRow>(
    `select ${MANUAL_COLUMNS} from public.manual_item_refunds m left join public.customers c on c.id = m.customer_id where m.status = $1 order by m.created_at desc limit 200`,
    [status]
  );
  return rows.map(hydrate);
}

export async function markManualRefund(id: string, status: ManualRefundStatus, sentBy: string): Promise<void> {
  await execute(
    `update public.manual_item_refunds set status = $2, sent_at = case when $2 = 'sent' then now() else sent_at end, sent_by = $3, updated_at = now() where id = $1 and status = 'pending'`,
    [id, status, sentBy]
  );
}
