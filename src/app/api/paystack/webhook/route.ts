import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findOrderByPaymentReference } from "@/lib/db/orders";
import { markPaystackPaymentSuccessful } from "@/lib/db/payments";
import { settleStoreWithdrawalFromPaystack } from "@/lib/db/stores";
import { verifyPaystackWebhook } from "@/lib/paystack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPaystackWebhook(rawBody, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    data?: { reference?: string; transfer_code?: string; amount?: number; currency?: string; status?: string };
  };
  const data = event.data;
  const reference = data?.reference;
  if (
    reference &&
    (event.event === "transfer.success" || event.event === "transfer.failed" || event.event === "transfer.reversed")
  ) {
    await settleStoreWithdrawalFromPaystack({
      reference,
      transferCode: data?.transfer_code,
      outcome: event.event === "transfer.success" ? "success" : "failed",
    });
    return NextResponse.json({ received: true });
  }
  if (event.event === "charge.success" && data && reference && data.currency === "NGN") {
    const amountNaira = Math.round((data.amount || 0) / 100);
    const marked = await markPaystackPaymentSuccessful(reference, amountNaira);
    if (marked) {
      // Best effort: drop the paid items from the buyer's basket. The webhook
      // has no user session, so it edits the shared basket cookie — the owner
      // reconciliation in auth keeps cross-account leakage out.
      try {
        const ref: string = reference;
        const order = await findOrderByPaymentReference(ref);
        if (order) {
          const cookieStore = await cookies();
          const raw = cookieStore.get("stillgood_cart")?.value;
          if (raw) {
            const parsed = JSON.parse(raw);
            const items = Array.isArray(parsed) ? parsed : parsed.items;
            if (Array.isArray(items)) {
              const paid = new Set(order.items.map((item) => item.productId));
              const remaining = items.filter(
                (item: { productId?: string }) => !paid.has(item?.productId ?? "")
              );
              const owner =
                !Array.isArray(parsed) && typeof parsed.owner === "string"
                  ? parsed.owner
                  : "guest";
              cookieStore.set("stillgood_cart", JSON.stringify({ owner, items: remaining }), {
                path: "/",
                httpOnly: true,
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 7,
              });
            }
          }
        }
      } catch {
        // ignore — payment already recorded; basket cleanup is best effort
      }
    }
  }
  return NextResponse.json({ received: true });
}
