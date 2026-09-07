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
