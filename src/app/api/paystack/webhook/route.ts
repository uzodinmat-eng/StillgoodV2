import { NextResponse } from "next/server";
import { markPaystackPaymentSuccessful } from "@/lib/db/payments";
import { verifyPaystackWebhook } from "@/lib/paystack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPaystackWebhook(rawBody, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    data?: { reference?: string; amount?: number; currency?: string };
  };
  if (event.event === "charge.success" && event.data?.reference && event.data.currency === "NGN") {
    const amountNaira = Math.round((event.data.amount || 0) / 100);
    await markPaystackPaymentSuccessful(event.data.reference, amountNaira);
  }
  return NextResponse.json({ received: true });
}
