import crypto from "node:crypto";

const PAYSTACK_API = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

async function paystackRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = (await response.json()) as { status: boolean; message?: string; data?: T };
  if (!response.ok || !body.status || body.data === undefined) {
    throw new Error(body.message || `Paystack request failed (${response.status})`);
  }
  return body.data;
}

export interface PaystackInitialization {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializePaystackTransaction(input: {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl?: string;
  metadata: Record<string, string | number | boolean>;
}): Promise<PaystackInitialization> {
  return paystackRequest<PaystackInitialization>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountNaira * 100),
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

export interface PaystackVerification {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string;
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerification | null> {
  try {
    return await paystackRequest<PaystackVerification>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET" }
    );
  } catch {
    // Unknown reference or Paystack unavailable: treat as unverified.
    return null;
  }
}

export function verifyPaystackWebhook(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const digest = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function initiatePaystackTransfer(input: { amountNaira: number; recipientCode: string; reference: string; reason: string }): Promise<{ transfer_code: string }> {
  return paystackRequest<{ transfer_code: string }>("/transfer", {
    method: "POST",
    body: JSON.stringify({ source: "balance", amount: Math.round(input.amountNaira * 100), recipient: input.recipientCode, reference: input.reference, reason: input.reason }),
  });
}

export interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string | null;
  active: boolean;
}

// Short in-memory cache so the bank dropdown does not hit Paystack on every render.
let cachedBanks: { banks: PaystackBank[]; fetchedAt: number } | null = null;
const BANK_CACHE_TTL_MS = 10 * 60 * 1000;

export async function listPaystackBanks(): Promise<PaystackBank[]> {
  if (cachedBanks && Date.now() - cachedBanks.fetchedAt < BANK_CACHE_TTL_MS) {
    return cachedBanks.banks;
  }
  const banks = await paystackRequest<PaystackBank[]>("/bank?currency=NGN", {
    method: "GET",
  });
  cachedBanks = { banks, fetchedAt: Date.now() };
  return banks;
}

export interface PaystackAccountResolution {
  account_number: string;
  account_name: string;
}

export async function resolvePaystackAccount(input: {
  accountNumber: string;
  bankCode: string;
}): Promise<PaystackAccountResolution> {
  const params = new URLSearchParams({
    account_number: input.accountNumber.trim(),
    bank_code: input.bankCode.trim(),
  });
  return paystackRequest<PaystackAccountResolution>(`/bank/resolve?${params.toString()}`, {
    method: "GET",
  });
}

export async function createPaystackRecipient(input: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<{ recipient_code: string }> {
  return paystackRequest<{ recipient_code: string }>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name: input.name.trim(),
      account_number: input.accountNumber.trim(),
      bank_code: input.bankCode.trim(),
      currency: "NGN",
    }),
  });
}

function normalizeNameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

// Locked name-match rule: the normalized resolved name must contain every token
// of the customer's name, or vice versa; otherwise the payout is blocked with
// the resolved name shown.
export function paystackNamesMatch(customerName: string, resolvedName: string): boolean {
  const customerTokens = normalizeNameTokens(customerName);
  const resolvedTokens = normalizeNameTokens(resolvedName);
  if (customerTokens.length === 0 || resolvedTokens.length === 0) return false;
  const customerInResolved = customerTokens.every((token) => resolvedTokens.includes(token));
  const resolvedInCustomer = resolvedTokens.every((token) => customerTokens.includes(token));
  return customerInResolved || resolvedInCustomer;
}
