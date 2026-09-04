# Open Questions

## Resolved (founder decisions, v3)

| # | Question | Decision |
| --- | --- | --- |
| 1 | Pickup-only at launch? | **Yes — pickup only.** The platform does not book couriers. A customer may send their own dispatch rider; handover is the 4-digit code. Platform-managed delivery is post-launch. |
| 2 | Revenue model | **10–12% commission per product** + **picking surcharge** `p(x) = 800 + 500(x − 1)` naira (x = stores in the order). Top-ups do not re-charge the ₦800 base; a brand-new store on a top-up adds **+₦500** only. |
| 3 | Wallet vs refund-to-source | Wallet stays (refund flows all land there). Ledger's external legs are **built from Paystack webhooks/endpoints** with daily reconciliation against Paystack's transaction/transfer lists. |
| 4 | Launch geography | **FCT/Abuja pilot.** |
| 5 | No-show policy | **48-hour window, no refund, items forfeited.** Store keeps payout; stock restored. Clock is **per sub-order**, from its latest ready time (a top-up that re-readies a sub-order restarts that clock). |
| 6 | Restaurants at MVP | **Later**, with same-day windows. |
| 7 | Store verification | **CAC + manual review.** Registration is **admin-driven**; attendants then log into the store backend and create their own PIN profiles. |
| 8 | PWA vs native | **Native iOS + Android + web.** Expo (React Native) customer + store apps, Next.js admin/web, monorepo. |
| 9 | Proof of handover | **4-digit pickup code, typed by the attendant. No QR.** |
| 10 | Fees | ₦50 withdrawal fee; **₦100 refund fee borne by the customer.** |
| 11 | Gateway | **Paystack only.** |
| 12 | App name | **Stillgood.** Order numbers `SG-XXXXX`. |
| 13 | Top-up stores | Same stores free; adding a brand-new store adds only the **+₦500 increment**. |
| 14 | Top-up window | Until the order is **released** (4-digit code accepted at the counter — customer or their rider). After that, a new order and a fresh ₦800. |
| 15 | CAC entity | Not yet registered. Register a **Private Limited Company** (see below). |

## CAC registration guidance

Register **Stillgood Technologies Ltd** (or a close variant if the name is taken) as a
**Private Limited Company**, not a Business Name.

| Why Ltd, not a Business Name | Detail |
| --- | --- |
| Paystack | Business verification and **Transfers** (store payouts, customer withdrawals) need a registered company and a corporate bank account. |
| Apple | Organization developer accounts need a legal entity with a D-U-N-S number, issued to companies. A Business Name usually forces an individual account (your personal name on the App Store listing). |
| Liability | Stillgood sits between customer money and near-expiry goods. An Ltd caps that risk at the company. |

Practical steps:

1. Reserve the name on the CAC portal **now** (also grab `stillgood.ng` / `stillgood.com.ng`
   and matching social handles before the name is public).
2. Principal activity: e-commerce / information technology services.
3. Standard ₦1,000,000 authorized share capital is enough to start.
4. You do **not** need NAFDAC licensing yourself — you never own the goods — but the T&Cs must
   put product-quality liability on stores (already in the spec).
5. Once the CAC certificate exists: open a corporate bank account, complete Paystack business
   verification, then apply for Apple (organization) and Google Play developer accounts under
   the same legal name.

## Still open

1. **Commission: exactly 10, 11, or 12%?** The system supports a config default with per-store
   overrides. **Recommendation:** default 10%, reserve 12% as the negotiating ceiling for
   stores you onboard later.
2. **Forfeiture legal copy.** No-refund forfeiture must appear in the T&Cs and at checkout to
   survive Paystack chargeback disputes. Fine to draft ourselves, but flag it to whoever
   reviews your terms.
3. **Does a top-up extend the 48-hour pickup window?** Spec currently: the clock is per
   sub-order and **restarts from that sub-order's latest ready time**. Confirm or correct.
4. **Assumptions still worth a yes/no:**
   - On forfeiture, the **store keeps its payout** and stock is relisted.
   - The ₦100 refund fee applies to **customer-requested refunds only**; refunds for items the
     store couldn't supply remain free.
   - If a store's entire sub-order turns out unavailable, the customer gets that store's ₦500
     surcharge increment back too (when it was an extra store).
   - Picking surcharge never applies twice as an ₦800 base on the same open order.
