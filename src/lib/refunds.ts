"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import {
  createRefundRequest,
  listRefundRequests,
  WalletRefundRequest,
} from "./db/refunds";
import { listPaystackBanks, PaystackBank } from "./paystack";

// Customer-facing wallet payout flow: requesting records a pending row only —
// no wallet debit happens here. The balance is re-checked atomically at payout
// time inside `fulfillRefund` (called by the admin pay action).
export async function requestWalletRefundAction(input: {
  amount: number;
  bankCode: string;
  bankName: string;
  accountNumber: string;
}): Promise<{ success: boolean; refund?: WalletRefundRequest; error?: string }> {
  const customer = await getSession();
  if (!customer) {
    return { success: false, error: "Log in to request a bank payout." };
  }

  try {
    const refund = await createRefundRequest({
      customerId: customer.id,
      amount: Math.round(Number(input.amount)),
      bankCode: input.bankCode,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: customer.name,
    });
    revalidatePath("/account");
    return { success: true, refund };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not record the payout request.",
    };
  }
}

export async function listMyRefundRequestsAction(): Promise<{
  success: boolean;
  requests?: WalletRefundRequest[];
  error?: string;
}> {
  const customer = await getSession();
  if (!customer) {
    return { success: false, error: "Log in to see your payout requests." };
  }

  try {
    const all = await listRefundRequests({ limit: 200 });
    return {
      success: true,
      requests: all.filter((request) => request.customerId === customer.id),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not load your payout requests.",
    };
  }
}

// Bank dropdown source for the AccountView payout form (cached server-side in
// `listPaystackBanks` so the dropdown does not hit Paystack on every render).
export async function listBanksAction(): Promise<{
  success: boolean;
  banks?: PaystackBank[];
  error?: string;
}> {
  try {
    const banks = await listPaystackBanks();
    return { success: true, banks };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not load the bank list.",
    };
  }
}
