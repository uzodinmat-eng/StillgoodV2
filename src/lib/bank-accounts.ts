"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { findCustomerById, saveCustomer } from "./db/customers";
import { listPaystackBanks, PaystackBank, paystackNamesMatch, resolvePaystackAccount } from "./paystack";

function maskAccount(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, "");
  return digits.length >= 4 ? `••••${digits.slice(-4)}` : "••••";
}

export async function listBanksAction(): Promise<{ success: boolean; banks?: PaystackBank[]; error?: string }> {
  try {
    const banks = await listPaystackBanks();
    return { success: true, banks };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not load the bank list." };
  }
}

export async function getMyBankAccountAction(): Promise<{
  success: boolean;
  bankCode?: string;
  bankName?: string;
  maskedAccount?: string;
  accountName?: string;
  resolvedAccountName?: string;
  verified?: boolean;
  error?: string;
}> {
  const customer = await getSession();
  if (!customer) return { success: false, error: "Log in to manage your refund account." };
  const full = await findCustomerById(customer.id);
  const active = full || customer;
  return {
    success: true,
    bankCode: active.bankCode,
    bankName: active.bankName,
    maskedAccount: active.bankAccountNumber ? maskAccount(active.bankAccountNumber) : undefined,
    accountName: active.bankAccountName,
    resolvedAccountName: active.bankResolvedAccountName,
    verified: Boolean(active.bankVerified),
  };
}

export async function saveMyBankAccountAction(input: {
  bankCode: string;
  bankName: string;
  accountNumber: string;
}): Promise<{ success: boolean; resolvedName?: string; maskedAccount?: string; error?: string }> {
  const customer = await getSession();
  if (!customer) return { success: false, error: "Log in to save your refund account." };
  const bankCode = input.bankCode.trim();
  const bankName = input.bankName.trim();
  const accountNumber = input.accountNumber.trim();
  if (!bankCode || !bankName) return { success: false, error: "Pick a bank." };
  if (!/^\d{10}$/.test(accountNumber)) return { success: false, error: "Enter a valid 10-digit account number." };
  try {
    const resolved = await resolvePaystackAccount({ accountNumber, bankCode });
    if (!paystackNamesMatch(customer.name, resolved.account_name)) {
      return {
        success: false,
        error: `Name mismatch: account resolves to "${resolved.account_name}". Refunds are blocked until the account matches ${customer.name}.`,
      };
    }
    const full = (await findCustomerById(customer.id)) || customer;
    await saveCustomer({
      ...full,
      bankCode,
      bankName,
      bankAccountNumber: accountNumber,
      bankAccountName: customer.name,
      bankResolvedAccountName: resolved.account_name,
      bankVerified: true,
    });
    revalidatePath("/account");
    return { success: true, resolvedName: resolved.account_name, maskedAccount: maskAccount(accountNumber) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not verify the account." };
  }
}
