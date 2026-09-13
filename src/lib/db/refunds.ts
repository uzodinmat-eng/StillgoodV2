import { asInt, execute, isoTimestamp, query, queryOne } from "./client";

export type WalletRefundStatus = "pending" | "fulfilled" | "failed" | "rejected";

export interface WalletRefundRequest {
  id: string;
  customerId: string;
  customerName?: string;
  amount: number;
  fee: number;
  netAmount: number;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  resolvedAccountName: string | null;
  nameMatch: boolean | null;
  status: WalletRefundStatus;
  paystackRecipientCode: string | null;
  paystackTransferCode: string | null;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
}

export const WALLET_REFUND_FEE = 100;

interface WalletRefundRow {
  id: string;
  customer_id: string;
  customer_name?: string | null;
  amount: number | string;
  fee: number | string;
  net_amount: number | string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  resolved_account_name: string | null;
  name_match: boolean | null;
  status: string;
  paystack_recipient_code: string | null;
  paystack_transfer_code: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  decided_at: Date | string | null;
}

function hydrateRefundRow(row: WalletRefundRow): WalletRefundRequest {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name || undefined,
    amount: asInt(row.amount),
    fee: asInt(row.fee),
    netAmount: asInt(row.net_amount),
    bankCode: row.bank_code,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountName: row.account_name,
    resolvedAccountName: row.resolved_account_name,
    nameMatch: row.name_match,
    status: row.status as WalletRefundStatus,
    paystackRecipientCode: row.paystack_recipient_code,
    paystackTransferCode: row.paystack_transfer_code,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
    decidedAt: row.decided_at ? isoTimestamp(row.decided_at) : null,
  };
}

const REFUND_COLUMNS = `r.id, r.customer_id, c.name as customer_name, r.amount, r.fee,
  r.net_amount, r.bank_code, r.bank_name, r.account_number, r.account_name,
  r.resolved_account_name, r.name_match, r.status,
  r.paystack_recipient_code, r.paystack_transfer_code,
  r.created_at, r.updated_at, r.decided_at`;

// Request-time helper for `requestWalletRefundAction`: validates and records a
// pending request. No wallet debit happens here; the balance is re-checked
// atomically at payout time inside `fulfillRefund`.
export async function createRefundRequest(input: {
  customerId: string;
  amount: number;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}): Promise<WalletRefundRequest> {
  const customerId = input.customerId.trim();
  if (!customerId) throw new Error("Missing customer id.");
  if (!Number.isInteger(input.amount) || input.amount <= WALLET_REFUND_FEE) {
    throw new Error(`Amount must be more than ₦${WALLET_REFUND_FEE}.`);
  }
  const bankCode = input.bankCode.trim();
  if (!bankCode) throw new Error("Pick a bank.");
  const bankName = input.bankName.trim();
  if (!bankName) throw new Error("Pick a bank.");
  const accountNumber = input.accountNumber.trim();
  if (!/^\d{10}$/.test(accountNumber)) {
    throw new Error("Enter a valid 10-digit account number.");
  }
  const accountName = input.accountName.trim();
  if (!accountName) throw new Error("Enter the account name.");

  const fee = WALLET_REFUND_FEE;
  const netAmount = input.amount - fee;
  const id = `wrr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

  await execute(
    `insert into public.wallet_refund_requests
       (id, customer_id, amount, fee, net_amount, bank_code, bank_name, account_number, account_name)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, customerId, input.amount, fee, netAmount, bankCode, bankName, accountNumber, accountName]
  );

  const row = await queryOne<WalletRefundRow>(
    `select ${REFUND_COLUMNS}
     from public.wallet_refund_requests r
     left join public.customers c on c.id = r.customer_id
     where r.id = $1`,
    [id]
  );
  if (!row) throw new Error("Could not load the refund request.");
  return hydrateRefundRow(row);
}

export async function listRefundRequests(filters?: {
  status?: WalletRefundStatus;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<WalletRefundRequest[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters?.status) {
    params.push(filters.status);
    clauses.push(`r.status = $${params.length}`);
  }
  if (filters?.from) {
    params.push(filters.from);
    clauses.push(`r.created_at >= $${params.length}::timestamptz`);
  }
  if (filters?.to) {
    params.push(filters.to);
    clauses.push(`r.created_at <= $${params.length}::timestamptz`);
  }
  const safeLimit =
    Number.isInteger(filters?.limit) && (filters?.limit as number) > 0
      ? Math.min(filters?.limit as number, 500)
      : 200;
  params.push(safeLimit);
  const rows = await query<WalletRefundRow>(
    `select ${REFUND_COLUMNS}
     from public.wallet_refund_requests r
     left join public.customers c on c.id = r.customer_id
     ${clauses.length > 0 ? `where ${clauses.join(" and ")}` : ""}
     order by r.created_at desc
     limit $${params.length}`,
    params
  );
  return rows.map(hydrateRefundRow);
}

// Records the Paystack account-verification outcome (resolved name + match flag)
// so the admin Refunds tab can gate the Pay button on it.
export async function setRefundResolved(
  id: string,
  input: { resolvedAccountName: string; nameMatch: boolean }
): Promise<void> {
  const refundId = id.trim();
  if (!refundId) throw new Error("Missing refund id.");
  const resolvedAccountName = input.resolvedAccountName.trim();
  if (!resolvedAccountName) throw new Error("Missing resolved account name.");
  await execute(
    `update public.wallet_refund_requests
     set resolved_account_name = $2, name_match = $3, updated_at = now()
     where id = $1`,
    [refundId, resolvedAccountName, input.nameMatch]
  );
}

// Single-row fetch for the admin verify/pay actions.
export async function getRefundRequest(id: string): Promise<WalletRefundRequest | null> {
  const refundId = id.trim();
  if (!refundId) return null;
  const row = await queryOne<WalletRefundRow>(
    `select ${REFUND_COLUMNS}
     from public.wallet_refund_requests r
     left join public.customers c on c.id = r.customer_id
     where r.id = $1`,
    [refundId]
  );
  return row ? hydrateRefundRow(row) : null;
}

// Rejects a still-pending request (no wallet movement; decided_at recorded).
export async function rejectRefund(id: string): Promise<void> {
  const refundId = id.trim();
  if (!refundId) throw new Error("Missing refund id.");
  await execute(
    `update public.wallet_refund_requests
     set status = 'rejected', decided_at = now(), updated_at = now()
     where id = $1 and status = 'pending'`,
    [refundId]
  );
}

// Atomic payout: balance-check + wallet debit + fulfilled status happen in one
// `fulfill_wallet_refund` transaction (mirrors `reserve_store_withdrawal` but
// collapses reserve+complete so the debit and status can never diverge). Call
// this after a successful Paystack transfer; call `reverseRefund` if the
// transfer fails after a reservation.
export async function fulfillRefund(
  id: string,
  input: { paystackRecipientCode: string; paystackTransferCode: string }
): Promise<void> {
  const refundId = id.trim();
  if (!refundId) throw new Error("Missing refund id.");
  const recipientCode = input.paystackRecipientCode.trim();
  const transferCode = input.paystackTransferCode.trim();
  if (!recipientCode) throw new Error("Missing Paystack recipient code.");
  if (!transferCode) throw new Error("Missing Paystack transfer code.");

  await execute(`select public.fulfill_wallet_refund($1, $2, $3)`, [
    refundId,
    recipientCode,
    transferCode,
  ]);
}

// Restores a reserved payout after a failed Paystack transfer (marks `failed`).
export async function reverseRefund(id: string): Promise<void> {
  const refundId = id.trim();
  if (!refundId) throw new Error("Missing refund id.");
  await execute(`select public.reverse_wallet_refund($1)`, [refundId]);
}

// Marks a request `failed` without touching the wallet. Use this when the
// Paystack transfer itself fails in the transfer-first payout flow: nothing
// has been debited yet (fulfillRefund runs after a successful transfer), so
// `reverseRefund` — which credits the wallet back — must NOT be used here;
// it would mint funds out of thin air.
export async function failRefund(id: string): Promise<void> {
  const refundId = id.trim();
  if (!refundId) throw new Error("Missing refund id.");
  await execute(
    `update public.wallet_refund_requests
     set status = 'failed', decided_at = now(), updated_at = now()
     where id = $1 and status = 'pending'`,
    [refundId]
  );
}
