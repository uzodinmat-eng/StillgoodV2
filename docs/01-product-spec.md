# Product Spec — Stillgood

This is the original idea fleshed out end to end. Everything from the handwritten notes is here,
reorganized, plus additions the notes missed. Additions are marked **[ADDED]** so you can see
what's new versus what you already had. Founder decisions are marked **[DECIDED]**.

**[DECIDED] Locked decisions (v3):**

- **App name:** Stillgood. Order numbers: `SG-XXXXX`.
- **Picking surcharge** per order: `p(x) = 800 + 500(x − 1)` naira, where x = number of stores
  in the order (1 store → ₦800, 2 → ₦1,300, 3 → ₦1,800). Platform revenue.
- **Top-up:** while an order is not yet **released**, the customer can add more items with
  **no new ₦800 base**. Adding a brand-new store adds only the **+₦500 increment**. After
  release, new items are a new order and pay a fresh ₦800.
- **Commission:** 10–12% per product (configurable; default 10%, per-store/product override).
- **Fees:** ₦50 withdrawal fee; **₦100 refund fee, borne by the customer**.
- **Pickup code:** 4 digits, entered manually by the attendant. No QR.
- **Pickup only.** The platform does not book couriers or charge a delivery surcharge. A
  customer may send their own dispatch rider; handover is still the 4-digit code.
- **No-show policy:** 48-hour pickup window; **no refund, items forfeited**.
- **Geography:** FCT/Abuja pilot. **Restaurants:** later, with same-day windows.
- **Store verification:** CAC number + manual admin review. Register the operating company as
  a **Private Limited Company** (e.g. Stillgood Technologies Ltd) — see
  `docs/05-open-questions.md`.
- **Store registration is admin-driven:** admin registers the store; attendants then log into
  the store's backend and create their own PIN profiles.
- **Platform:** native iOS + Android apps (customer and store) plus web; Paystack only.

---

## 1. The one-paragraph pitch

Supermarkets throw away or heavily shelf-discount stock that's approaching expiry. Stillgood
lets a store attendant photograph a product, have AI fill in the name/description, set a
starting price and a floor price, and list it. The price decays automatically each month as
expiry approaches. Customers browse deals near them, pay online (Paystack), and pick the order
up in store (or send their own rider with the 4-digit code). A wallet system absorbs the
messiness of items being unavailable at picking time. The platform earns a 10–12% commission
per product plus a per-order picking surcharge.

## 2. Roles

| Role | Description |
| --- | --- |
| **Customer** | Browses, buys, picks up (or sends a rider). Has a wallet for refunds. |
| **Store owner** | Business registered by the admin (CAC no.), manages staff, sees balance, withdraws. |
| **Attendant / staff** | Sub-profile under a store, protected by a PIN. Lists inventory and picks orders. Every action is attributed to a specific attendant. |
| **Platform admin** | You. Sees everything: all orders, all money movement, store performance. Registers stores. |

**[ADDED]** Attendant actions are audit-logged (who listed what, who marked what unavailable,
who confirmed which order). The notes wanted "see all logins by attendants" — extend that to all
sensitive actions, because unavailability marks move money.

---

## 3. Customer side

### 3.1 Accounts & profile

- Sign up with **Google, email, or phone number**. Email and phone both require verification
  (email link / SMS OTP). Phone changes re-verify.
- Profile: name, profile picture, pickup address (optional, for their own rider), **state
  preference** (drives which stores they see — launch is per-state).
- Settings: email notifications, push notifications, change email/phone/password, delete account,
  log out, About Us, Rate Us.
- **[ADDED]** Saved cards are never stored by us — Paystack tokenizes them and we store only the
  authorization token. This answers the "(for card details?)" question in the notes: yes, but via
  the gateway, never raw card data (PCI compliance).
- **[ADDED]** Delete account must handle open orders and a nonzero wallet balance: block deletion
  until orders are terminal and wallet is withdrawn/zeroed.

### 3.2 Browsing & discovery

Shop hierarchy: **Type → Store → Location**, with types Market, Supermarket, Restaurant
(extensible — the "?" in the notes becomes a `store_types` table so you can add Pharmacy etc.
later; pharmacies are actually a great fit for this model). Restaurants are deferred at launch.

Home feed controls:

- **State switcher** (defaults to profile preference).
- **Filter:** all stores / single store (e.g. "Bakan Gizo — Gwarinpa 1st Ave") / store type.
- **Sort:** price (low→high, high→low), closest to expiry, furthest from expiry, recommended.
- **View toggle:** list (1 per row) or card grid (2 per row). Persist the user's choice.
- **[ADDED] Search** by product name — the notes had no search, and past ~200 listings browsing
  alone is unusable.
- **[ADDED] Product categories** (Drinks, Snacks, Dairy, Toiletries, …) as a filter chip row.
  Stores already need categories on the store side, so surface them here too.
- **[ADDED] "Recommended"** at launch = simple heuristic (biggest % discount × closest expiry ×
  store rating). Don't build ML for this.

### 3.3 Item detail page

Shows: 1:1 photo, name, price (with original price struck through and % off — **[ADDED]**, this
is the whole value proposition, show it loudly), description, expiry date **and** human-friendly
time-to-expiry ("expires in 3 weeks"), store name + rating, quantity left, **"in N other carts"**
social-pressure counter, quantity selector, add-to-cart button.

- **[ADDED]** "In N other carts" needs live cart tracking: carts are server-side rows, not just
  local state. Count distinct active carts containing the item, cache for ~1 minute.
- **[ADDED]** Low-stock urgency ("Only 2 left") and a "price drops to ₦X on <date>" hint — this
  creates the buy-now-or-gamble tension that makes decay pricing fun.

### 3.4 Cart & checkout

- Cart icon top-right with item count badge. Cart page lists items grouped **by store**
  (**[ADDED]** — grouping matters because a multi-store order means multiple pickups; make that
  visible *before* payment, not after), each line shows qty, price, subtotal; grand total at the
  bottom.
- **[ADDED] Stock behavior in cart:** adding to cart does *not* reserve stock (too abusable).
  Stock is checked and decremented atomically at payment confirmation. If someone else bought the
  last unit while you were checking out, that line is auto-refunded to wallet via the normal
  unavailability flow.
- **[DECIDED] Picking surcharge** added at checkout: ₦800 for the first store + ₦500 per
  additional store in the order (`p(x) = 800 + 500(x − 1)`). Shown as its own line under the
  items subtotal so customers understand why splitting across stores costs more.
- **[DECIDED] Pickup only.** No fulfillment-method toggle, no delivery surcharge. Copy on the
  cart makes clear: collect in store, or send your own rider with the 4-digit code.
- Checkout → choose payment method → **Paystack** (the only gateway at launch — [DECIDED]).
  Wallet balance can also part-pay (**[ADDED]** — the notes say refunds land in the wallet and
  "they can order more stuff", which implies wallet must be spendable at checkout).
- On gateway confirmation (webhook, not just the redirect — **[ADDED]**, redirects can be spoofed
  or dropped): show a **payment confirmation screen for ~3 seconds**, then redirect to the
  **order confirmation page**.

### 3.5 Order lifecycle (customer view)

Order confirmation page is a live status tracker:

1. **Paid / Approved** — money captured, order sent to store(s).
2. **Picking** — attendant is gathering items.
3. **Picked** — all available items confirmed. If some items were unavailable: "2 items were
   unavailable — ₦1,400 has been returned to your wallet."
4. **Ready for pickup** — **[DECIDED]** customer gets a **4-digit pickup code** (no QR). The
   notes' final status "released if picked up" needs a mechanism: the attendant types the code
   at handover, order → **Released/Completed**. Without this there's no proof of handover and
   disputes are unresolvable. The customer (or a rider they sent) states the code at the counter.
5. Terminal states: **Released** (handed over), **Refunded**, **Forfeited** (no-show).

Order history: order ID (`SG-XXXXX`), date/time placed, pickup time, total, status; tap for
full detail.

- **[DECIDED] No-show policy:** 48-hour pickup window. If the customer doesn't show, the order
  is **forfeited — no refund**. Items return to store stock, the store keeps its payout, the
  platform keeps commission + surcharge. Reminder notifications at 24h and 4h before the
  deadline, and the policy is stated loudly at checkout and on the order page (forfeiture
  without warning is a guaranteed dispute generator).

#### 3.5.1 Top-up (add to an open order)

**[DECIDED]** If only some items were available, the refunded balance (or a new card charge)
can be spent on **the same order** without paying another ₦800 base surcharge.

- On the open-order page, an **"Add to this order"** button returns the customer to browse
  with the cart attached to that order.
- Surcharge on a top-up:
  - Items from stores **already on the order:** ₦0 extra picking surcharge.
  - Items from a **brand-new store:** only the **+₦500 increment** (the formula's per-extra-store
    term). `picking_surcharge` on the order is increased by ₦500 per new store.
- Window: top-ups are allowed **until the order is released** (4-digit code accepted at the
  counter — handed to the customer or their rider). After release, new items form a **new
  order** with a fresh ₦800.
- Payment: wallet first, then a new Paystack charge for any remainder. Each charge is a row on
  `order_payments` keyed to the same order (see data model).
- Store-side effect: topping up a sub-order that was already confirmed/ready **returns that
  sub-order to pending** so the attendant re-picks the new lines. A new store creates a new
  sub-order under the same parent order. One combined handover at release.
- **Partial release:** if store A is already released and store B is not, top-ups may still
  target store B (or a new store). Store A is closed — no more items for A on this order.
- **Forfeiture clock:** runs **per sub-order** from its latest ready time. A top-up that sends
  a sub-order back to pending, then ready again, **restarts that sub-order's 48h window**.

### 3.6 Wallet (customer)

- Refunds for unavailable items land here instantly — no fee (the store caused it, not the
  customer).
- Spendable at checkout **and on top-ups**.
- Withdrawable to a Nigerian bank account via Paystack Transfers, **₦50 fee** per withdrawal
  (**[DECIDED]**).
- **[DECIDED]** Customer-requested refunds of a confirmed order carry a **₦100 refund fee borne
  by the customer** (deducted from the refunded amount).
- **[ADDED]** Full transaction history (credits, debits, withdrawals) visible in-app — required
  for trust and for support.
- **[ADDED, IMPORTANT]** Holding customer money may have regulatory weight in Nigeria (CBN rules
  around stored value). Mitigations documented in `docs/03-payments-and-wallet.md`: keep the
  wallet as a *ledger against your settlement account* (common startup approach) or refund to
  source instead.

### 3.7 Ratings

- Store ratings only (the notes struck out product ratings — agreed, keep it simple).
- **[ADDED]** Rating prompt only after a **Released** order for that store — verified-purchase
  ratings only, otherwise stores get review-bombed.

---

## 4. Store side

### 4.1 Registration & verification

- **[DECIDED] Registration is admin-driven:** the admin registers each store from the admin
  dashboard with: business name, **CAC number**, store type, state, address(es), contact
  phone/email, settlement bank account (**[ADDED]** — needed for withdrawals, verify via
  Paystack's bank account resolution API). The admin then issues the store's login credentials
  to the owner. No public self-serve store signup at launch — this doubles as the verification
  step.
- **[DECIDED]** Verification is **CAC number + manual admin review** (check the CAC public
  search). Store status: `pending → approved → suspended`. No automated CAC verification for
  MVP.
- One business can have **multiple branches/locations** — the notes' example "Bakan Gizo —
  Gwarinpa 1st Ave" implies this. Model: `businesses → stores (branches)`.

### 4.2 Staff / attendants

- **[DECIDED]** Attendants log into the store's backend (the store app, using the store's
  credentials) and **create their own profiles** there. Each attendant sets + confirms a
  **PIN on first profile creation**, then enters the PIN on every login/profile switch. The
  owner can also create profiles for staff.
- Staff management screen: card view of all staff, **activate/deactivate toggle**, edit name,
  reset PIN, view login history (**[ADDED]**: full audit trail of actions, not just logins).
- **[ADDED]** PIN is per-attendant on a shared store device (the realistic hardware setup: one
  tablet/phone at the till). Session model: the *store* is logged in on the device; attendants
  switch profiles with PINs, like Netflix profiles. Cheap and matches how shops actually work.

### 4.3 Listing a product (the AI photo flow)

1. Attendant taps "Add product" → in-app camera with a **1:1 crop frame** so every image on the
   marketplace is uniform.
2. Photo goes to the vision LLM, which returns: **product name, category guess, description**,
   and (**[ADDED]**) reads the printed **expiry date** off the packaging when visible —
   attendant confirms or corrects. This is a big time-saver and the model is good at it.
3. Attendant enters:
   - **Expiry date** (or months-to-expiry),
   - **Quantity**,
   - Price, one of two modes:
     - **Decay mode:** starting/current price + required **last** (floor) price. Each week the
       selling price drops **2.5% of the (start − last) gap**, never below last. The shop shows
       a single price until the first weekly drop; after that it shows the new price with the
       start price struck through, and last price on the item page.
     - **Last-price only:** last price is required. A listing cannot have a current price
       without a last price.
4. **[ADDED]** A nightly job (`pg_cron`) applies price drops and **auto-archives anything that
   reaches its expiry date**. Selling expired goods is a NAFDAC problem — the system must make it
   impossible, not just discouraged. Also auto-archive at quantity 0.
5. **[ADDED]** Recommended guardrail: refuse listings with less than 7 days to expiry for
   packaged goods (configurable per store type — restaurants would need hours-level windows,
   which is why restaurants are deferred).

### 4.4 Inventory tab

- Sub-tabs: **Live / Archived / Deleted** (soft delete only — order history references items).
- Each item card has a **⋮ menu**: edit, change category, archive, delete.
- Edit opens an item page mirroring the customer view but editable: name, description, photo,
  price(s), quantity, expiry, category. (**[ADDED]** price edits while an item sits in carts just
  apply at next checkout — no need to lock.)
- Product categories are managed in store settings.

### 4.5 Orders tab

Sub-tabs: **Pending / Confirmed / Completed** (the notes' three tabs), 5 per page on Pending.

- New order → push notification + row appears in Pending with buyer name, order no., total, item
  count. Sortable by time, price, item count.
- Tap an order → item checklist. Each line gets **✓ available / ✗ unavailable**. When done,
  attendant taps **Confirm**:
  - Money for available items credits the **store balance** (held until completion — see money
    flow doc).
  - Customer is notified; unavailable-item value auto-refunds to their wallet.
  - Order → **Confirmed**.
- **[ADDED]** Every ✗ decrements the store's **availability rate**, which the admin dashboard
  tracks (the notes wanted this) and which can gate store ranking in "recommended".
- A **top-up** on a confirmed/ready sub-order returns it to **Pending** with the new lines
  unmarked; the attendant re-picks. Handover waits until the latest pick is confirmed.
- On handover, attendant types the customer's **4-digit pickup code** (customer or their own
  rider) → sub-order → **Released/Completed**, store money becomes withdrawable.
- Refund of a confirmed order (customer-requested, processed by the store or admin): allowed,
  with the **₦100 refund fee borne by the customer** (**[DECIDED]** — deducted from the refund).
- Completed orders visible for **6 months**, then archived (**[ADDED]**: archived to cold
  storage/export, not hard-deleted — you'll want the data, and finance records generally must be
  retained).

### 4.6 Store profile & money

- Balance display + **Withdraw** button (to verified settlement account, Paystack transfer).
- **[ADDED]** Balance is split into **pending** (confirmed orders not yet picked up) and
  **available** (completed orders, minus platform commission). Withdrawals only from available.
  **[DECIDED]** On a no-show forfeiture the pending amount also becomes available at the 48-hour
  deadline (the store did its work; the customer forfeits).
- Staff management (4.2), notifications, feedback form, redeem rewards (**[ADDED]**: keep
  "rewards" as a stub screen for MVP — it's a retention feature, not a launch feature).

---

## 5. Admin side

Dashboard (you + trusted ops people only, role-gated):

- **Money:** GMV and platform revenue across all stores, bucketed by **15m / 30m / 1h / 6h /
  12h / 24h / week / month / 3mo / 6mo / year**, plus a **calendar range picker** for custom
  windows. Daily withdrawal totals. **Dormant balance** (sum of all customer + store wallet
  balances) — this is your float and your liability, watch it.
- **Orders:** every order, filterable by store/status/date. Clicking an order shows the full
  multi-store breakdown: store A's items + subtotal, then store B's, etc. — exactly the view the
  notes describe. Stores only ever see their own slice. Top-ups and extra `order_payments` rows
  are visible on the same order.
- **Store health:** availability rate per store (unavailable items ÷ items ordered), flagging
  stores that don't maintain their inventory. **[ADDED]** also: time-to-confirm and
  time-to-ready medians per store — slow stores kill the customer experience as surely as
  unavailable items.
- **[ADDED] Store approval queue** (registration review, CAC check) and store suspension.
- **[ADDED] Customer support tools:** look up any user/order, manual wallet adjustment (with
  mandatory reason, double-logged), resend notifications. You *will* need this in week one of the
  pilot; retrofitting it under fire is painful.
- **[ADDED] Config panel** for the numbers that will change during the pilot: withdrawal fee
  (₦50), refund fee (₦100), commission % (10–12), picking surcharge base (₦800) and per-extra-
  store increment (₦500), pickup window (48h), minimum days-to-expiry.
- **[DECIDED] Store registration lives here** (admin creates stores, §4.1) alongside the
  approval/suspension controls.

---

## 6. Cross-cutting concerns the notes missed

1. **Revenue model ([DECIDED]).** Two launch streams: **10–12% commission per product**
   (deducted before crediting the store) and the **picking surcharge** `p(x) = 800 + 500(x − 1)`,
   including +₦500 increments from top-ups that add stores. Plus the ₦50 withdrawal and ₦100
   refund fees. Platform-managed delivery is deferred.
2. **Order splitting.** One customer order fans out into per-store **sub-orders** (the notes
   describe this from the admin view; it needs to be a first-class DB concept —
   see data model doc). Each sub-order has its own status and pickup code. Top-ups append items
   (and sometimes a new sub-order) to the same parent order.
3. **Notifications infrastructure.** Native push via the mobile apps (Expo push / FCM + APNs),
   email, SMS. Every status transition in §3.5 and §4.5 maps to a notification. SMS is expensive
   in Nigeria — reserve it for OTP and "order ready" only.
4. **Realtime.** Store order tab and customer order tracker should update live (Supabase
   Realtime subscription on the orders table) — no refresh-mashing. Top-ups that bounce a
   sub-order back to pending must ping the store immediately.
5. **Trust & safety.** Report-a-listing button; admin takedown; blocked-words check on
   AI-generated descriptions; rate-limit listing creation.
6. **Poor-connectivity reality.** Aggressive caching of images and the feed in the mobile apps;
   small payloads; images served resized/webp via Supabase image transforms; queued retries for
   listing uploads on flaky connections.
7. **Legal.** Terms of service must put product-quality liability on stores; NAFDAC positioning
   ("discounted, *not expired*" — enforce via auto-archive); NDPR (Nigerian data protection)
   basics for the account-deletion flow; no-refund forfeiture copy at checkout and in the T&Cs.
8. **The cold-start problem.** The marketplace is worthless empty. Launch plan: onboard 3–5
   supermarkets in one Abuja neighborhood yourself, list their stock *for* them in week one, and
   only then open customer signups. (Reflected in the sprint plan.)
