# Payments, Wallet & Money Flow

The money design is the riskiest part of the product, so it gets its own doc. Everything here
maps onto the `wallets` / `ledger_entries` / `order_payments` tables in `02-data-model.md`.

## Fee schedule (founder-decided)

| Fee | Amount | Borne by | Goes to |
| --- | --- | --- | --- |
| Commission | 10–12% per product (config, default 10%) | Store | Platform |
| Picking surcharge (initial) | `p(x) = 800 + 500(x − 1)` naira, x = stores in order | Customer | Platform |
| Picking surcharge (top-up) | ₦0 for stores already on the order; **+₦500 per brand-new store** | Customer | Platform |
| Withdrawal fee | ₦50 per withdrawal | Withdrawer | Platform |
| Refund fee | ₦100, deducted from the refund | Customer | Platform |
| No-show | Full forfeiture after 48h — no refund | Customer | Store keeps payout; platform keeps commission + surcharge |

Unavailable-item refunds at picking time are **free** — the store failed to have the item, so
the customer isn't charged for the store's miss.

Pickup only: there is no delivery surcharge and no courier-cost ledger kind.

## Principles

1. **Append-only double-entry ledger, built from Paystack events.** Money is never a mutable
   `balance` column. Every movement is a transaction with legs summing to zero; balances are
   sums. External-money entries (payments in, transfers out) are only ever written from
   **verified Paystack webhooks or Paystack verify/list endpoints** — Paystack is the source of
   truth for money crossing the boundary, and a reconciliation job diffs our ledger against
   Paystack's `GET /transaction` and `GET /transfer` lists daily. Internal entries (splitting a
   payment between stores, wallet refunds, commission, surcharges) are ours alone — Paystack has
   no concept of them, which is why the internal ledger must exist at all.
2. **All money code runs server-side** behind webhook verification. The client never tells the
   server how much anything costs — the server recomputes from the DB.
3. **Webhooks are the source of truth**, not redirect URLs. Handle Paystack's `charge.success`
   and `transfer.success/failed/reversed` events; verify the `x-paystack-signature` HMAC.
   Webhooks can arrive twice — every handler must be idempotent (keyed on `gateway_ref` on
   `order_payments`).

## The flow, step by step

### 1. Checkout → payment

```
Customer clicks Pay. Example: items ₦10,000 from 2 stores, picking surcharge ₦1,300
 → total ₦11,300; ₦1,000 from wallet, ₦10,300 by card
 → server re-prices the cart AND recomputes surcharge, creates order (pending_payment)
   + sub_orders + order_payments row (kind=initial)
 → wallet leg recorded immediately:  customer_wallet −1,000 / platform +1,000
 → Paystack transaction initialized for ₦10,300, customer redirected to gateway
 → webhook charge.success arrives:
     ledger: platform_wallet +10,300 (kind=payment_in, ref = Paystack reference)
     picking_surcharge +1,300 booked as platform revenue
     order_payments → success; order → paid
     stock decremented atomically (if a line lost the race for the last unit,
       it's immediately marked unavailable and refunded as in step 2)
     sub_orders → pending; stores notified
 → customer sees payment-confirmation splash (3s) → order confirmation page
```

If the webhook never arrives (dropped): a reconciliation cron re-queries Paystack's
verify-transaction API for `order_payments` stuck in `pending` > 10 minutes.

### 1b. Top-up payment (same order, no new ₦800)

```
Customer taps "Add to this order" while the order is not yet released
 → browses, carts items; checkout computes:
      item total of the top-up
      surcharge delta = ₦0 if all stores already on the order
                      = ₦500 × (count of brand-new stores)
 → wallet applied first; remainder initialized as a new order_payments row (kind=top_up)
 → on charge.success:
     items_subtotal and picking_surcharge on the order increased
     existing same-store sub_orders: new lines appended, status → pending (re-pick)
     new stores: new sub_order created under the same order
     stores notified
```

After **release** (4-digit code accepted), this path is closed. New items create a new order
and pay a fresh ₦800.

### 2. Picking & partial availability

```
Attendant opens sub_order, marks each line ✓/✗, taps Confirm
 → for available lines:   platform −X / store_wallet +X (kind=order_payout_pending)
                          platform commission taken here: store gets X·(1−c), platform keeps X·c
 → for unavailable lines: platform −Y / customer_wallet +Y (kind=item_refund)
   (If that store's entire sub-order is unavailable, also refund this store's ₦500 increment
    of the picking surcharge when it was an extra store — see open questions.)
 → sub_order → confirmed; customer notified ("2 items unavailable, ₦Y refunded to wallet")
```

Store money from this step is **pending balance** — visible but not withdrawable until pickup.
This protects customers: if the store never hands the goods over, the money can still come back.

### 3. Pickup / handover (released)

```
Customer (or a dispatch rider they sent themselves) states the 4-digit code
Attendant types it in
 → sub_order → completed (released); store's pending balance for it becomes available
 → customer prompted to rate the store
```

The platform never books a courier. "Released" means the bag left the counter with whoever
presented the code.

Pending → available can be modeled either as two wallet buckets or as a status flag on the
payout ledger entries; the flag (`order_payout_pending` → released by a `payout_release` marker
entry) is simpler.

### 4. No-show (founder-decided: forfeiture)

```
pickup_deadline passes (48h after the sub-order's latest ready time, configurable)
 → cron marks the sub_order forfeited — NO refund
 → store's pending payout is released to available (store did its work)
 → platform keeps commission + surcharge
 → items return to store stock (quantity restored, relisted if not expired)
```

A top-up that returns a sub-order to pending and then ready again **restarts that sub-order's
48h clock** from the new ready time.

The policy must be displayed at checkout and on the order page, with reminders at 24h and 4h —
forfeiture without loud warnings will generate chargebacks and Paystack disputes.

### 5. Refund of a confirmed order (customer-requested)

```
 → store_wallet −(refunded items subtotal) / customer_wallet +(subtotal − 100)
 → platform +100 (kind=refund_fee, borne by the customer per founder decision)
```

### 6. Withdrawals

**Customer:** wallet → bank via Paystack Transfers. ₦50 fee (`withdrawal_fee` config).
Ledger: `customer_wallet −(amount+50)`, `platform +50`, `platform −amount` matched against the
Paystack transfer. Transfer failures reverse the ledger legs and notify.

**Store:** available balance → verified settlement account, same mechanics. Account is verified
at onboarding via Paystack's *resolve account number* API (returns the account name to match
against the CAC business name).

Note: Paystack Transfers requires a funded Paystack balance and **business verification** on
your Paystack account. That verification needs a registered company (Stillgood Technologies Ltd
or similar) — see `docs/05-open-questions.md`. Sort this out early (Sprint 0 checklist).

## Gateway choice

**Paystack only — founder-confirmed.** Best-documented Nigerian gateway, one API for charges +
transfers + account resolution, good test mode. The code should still isolate gateway calls behind a small
`PaymentProvider` interface (`initializeCharge`, `verifyCharge`, `createTransfer`,
`resolveAccount`, `verifyWebhook`) so Flutterwave can slot in later.

| Capability | Paystack | Flutterwave |
| --- | --- | --- |
| Init charge | `POST /transaction/initialize` | `POST /payments` |
| Verify | `GET /transaction/verify/:ref` | `GET /transactions/:id/verify` |
| Webhook sig | `x-paystack-signature` (HMAC-SHA512 of body) | `verif-hash` header equals your secret hash |
| Payout | `POST /transferrecipient` + `POST /transfer` | `POST /transfers` |
| Resolve bank acct | `GET /bank/resolve` | `GET /accounts/resolve` |
| Saved cards | authorization code returned on first charge | tokenization via `token` |

Fees (verify current rates before launch): Paystack ≈ 1.5% + ₦100 (₦100 waived under ₦2,500,
local cards, capped ₦2,000); transfers ₦10–50 by amount. Price your commission with this in mind.

## Regulatory note on the wallet

Holding refundable customer balances edges toward "stored value," which the CBN regulates.
Common early-stage approaches, from lightest to heaviest:

1. **Ledger against your settlement account** (what's designed above): funds sit in your
   corporate/Paystack account; the wallet is bookkeeping. Most marketplaces start here, but get
   a Nigerian fintech-savvy lawyer's read before scale.
2. **Refund to source** instead of wallet: simpler regulatorily, worse UX (card refunds take
   days), and kills the "order more stuff with your refund" loop the product wants.
3. **Partner wallet provider** (e.g. providers offering wallet-as-a-service) once volume
   justifies it.

Recommendation: launch with (1), keep total dormant balance visible on the admin dashboard, and
revisit before the balance gets big.
