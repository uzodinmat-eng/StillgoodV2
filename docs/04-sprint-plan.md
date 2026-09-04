# Stack Recommendation & Sprint Plan

Founder decision: **native iOS + Android apps for customers and stores, plus web** — mobile
first, because attendants list items from a phone camera and customers shop on phones. The
easiest stack that delivers that combo with one intermediate developer is below.

## The stack

| Layer | Pick | Why this over alternatives |
| --- | --- | --- |
| Mobile apps | **Expo (React Native + TypeScript), two apps: Customer and Store** | One TypeScript codebase per app compiles to iOS **and** Android. Expo specifically (over bare React Native) because: **EAS Build** does cloud builds so you don't need a Mac for iOS; **EAS Update** pushes JS fixes over the air without app-store review; `expo-camera` handles the 1:1 capture flow; `expo-notifications` gives push on both platforms through one API. Flutter is the credible alternative but means learning Dart and losing type-sharing with the web/server code. |
| Customer web | **Expo Router web output** of the customer app | The same customer codebase exports a usable website — the "web" part of your combo nearly free. If SEO/marketing pages matter later, add a small Next.js site then. |
| Admin + server | **Next.js (App Router) on Vercel** | Admin is a desktop web dashboard — no reason to make it an app. The same Next.js project hosts the server side: Paystack webhook handlers, money/ledger functions, AI listing endpoint, and cron routes (reconciliation, no-show forfeiture). One deploy, and the money code lives behind a real server, never in the apps. |
| Repo shape | **pnpm monorepo** (`apps/customer`, `apps/store`, `apps/admin`, `packages/shared`) | Shared package holds the Supabase client, generated DB types, fee formulas (`p(x) = 800 + 500(x−1)` lives in exactly one file), and validation schemas — so the apps and server can never disagree about prices. |
| Backend-as-a-service | **Supabase** | Postgres + Auth (Google, email, phone OTP) + Storage (product images with on-the-fly resizing) + Realtime (live order tabs in the apps) + Row-Level Security + `pg_cron` (price decay). Works identically from React Native and Next.js. The alternative (custom API + managed Postgres + S3 + socket server) is 3–4× the surface area for zero product benefit at this stage. |
| Payments | **Paystack** (founder-confirmed, sole gateway) | Checkout inside the apps via Paystack's checkout page in a WebView (`react-native-paystack-webview` or an in-app browser) — fine under Apple's rules because these are physical goods, which are exempt from in-app-purchase requirements. Transfers/account-resolution for payouts. |
| SMS OTP | **Termii** | Nigerian-focused, far cheaper than Twilio on NG routes; plugs into Supabase phone auth as a custom SMS hook. |
| AI (photo → listing) | **OpenAI `gpt-4o-mini` vision** | One API call: image in → `{name, category, description, expiry_date_if_visible}` out. Cheap (fractions of a cent per image). Gemini Flash is the drop-in alternative. Called from the server, never with the key in the app. |
| Push notifications | **Expo Push** (wraps FCM + APNs) | One send API for both platforms, free. |

**One-time costs to plan for:** Apple Developer Program **$99/year**, Google Play Console
**$25 once**. Apple app review takes days and can reject — submit early builds via TestFlight
long before launch day (built into the sprint plan). Everything else is free tier at pilot
scale, plus SMS usage and Paystack fees. App Store / Play listings use the name **Stillgood**.

**Why two mobile apps instead of one app with a mode switch:** app stores treat consumer and
business tools as different listings; attendants get a focused device experience (camera-first,
orders tab); and you can update one without re-reviewing the other. The monorepo keeps the cost
of "two apps" low — they share all the non-UI code.

**What we're deliberately not using:** Flutter/native Swift+Kotlin (new languages, no code
sharing with the server), Firebase (Firestore's NoSQL model fights the ledger/orders relational
shape), a separate NestJS/Django API (Next.js route handlers already give you a server),
microservices/Redis/queues (not at this scale).

## Sprint plan

Sprints are scoped as coherent, shippable slices — each ends with something you can tap
through on a phone. Store side before customer side: a marketplace with no inventory can't be
tested.

### Sprint 0 — Foundations
- pnpm monorepo scaffold: `apps/customer` (Expo), `apps/store` (Expo), `apps/admin` (Next.js),
  `packages/shared`. EAS project configured; first dev builds installed on real Android + iOS
  devices (this always shakes out signing/config pain — do it now, not at launch).
- Supabase project; migrations from `02-data-model.md`; RLS policies; seed script with fake
  stores/items so every later sprint has data to render.
- Auth working in all three apps: email + Google sign-in, profile creation, role gating.
- Paystack + Termii + OpenAI accounts; Apple Developer + Play Console registrations submitted
  (Apple verification can take days); keys in env, `.env.example` documented.
- **Done when:** you can sign into all three surfaces as three roles on real devices.

### Sprint 1 — Store app: onboarding & the AI listing flow
- Admin-side store registration (minimal form for now — admin creates the business + branch
  with CAC no., settlement account with Paystack account-name resolution, issues credentials).
- Store app login; attendants create their own profiles and set/confirm PINs; PIN login and
  profile switcher; audit log writes.
- **The flagship flow:** `expo-camera` capture with a 1:1 crop frame → server AI endpoint →
  prefilled listing form (name/category/description/expiry) → price modes (decay: start+floor;
  fixed: floor) → quantity → publish. Queued retry when the connection drops mid-upload.
- Inventory tab: Live/Archived/Deleted, ⋮ menu, edit page.
- `pg_cron` nightly job: price decay + auto-archive expired/zero-quantity items.
- **Done when:** a real attendant can photograph a tin of milk on a phone and have it live in
  60 seconds.

### Sprint 2 — Customer app: browsing & cart
- Home feed: state switcher, store/type/category filters, all four sorts, card/list toggle,
  search.
- Item detail page: photo, strikethrough pricing, expiry countdown, "in N carts", quantity
  left, store rating, add to cart.
- Server-side cart, grouped by store, with the picking-surcharge preview updating as stores are
  added (₦800 → ₦1,300 → ₦1,800…) so the fee never surprises anyone at checkout.
- Store directory + store page; Expo web export checked so the customer web build stays working.
- **Done when:** a customer can find and cart items from two seeded stores and see the
  surcharge math live.

### Sprint 3 — Checkout, payments & the ledger
- Wallet/ledger tables and server-side money functions — the sprint to go slow on; write tests
  for the ledger invariant and the surcharge/commission math.
- Paystack checkout in a WebView from the customer app; webhook handler in the admin app's API
  routes (signature check, idempotency); daily reconciliation against Paystack's
  transaction/transfer list endpoints.
- Order fan-out into sub_orders; **`order_payments`** rows (initial charge); picking surcharge
  computed and stored on the order; stock decrement at payment; payment-confirmation splash →
  order confirmation page.
- **Top-up checkout path:** cart attached to an open order, surcharge delta ₦0 or +₦500 per
  new store, extra `order_payments` row, append-or-create sub_orders.
- Wallet: balance display, apply-at-checkout (and on top-ups), transaction history.
- **Done when:** a test-mode card payment produces a paid order, a follow-on top-up charges
  only the increment when a new store is added, ledger legs including surcharge and commission
  balance, and books stay balanced.

### Sprint 4 — Fulfillment loop
- Store app Orders tab (Pending/Confirmed/Completed, sorting, 5-per-page) with realtime updates.
- Picking screen: ✓/✗ per line, confirm → payouts + free partial refunds per the money-flow doc.
- **Re-pick after top-up:** a confirmed/ready sub-order that receives new lines returns to
  Pending; attendant picks the new items; one combined handover at release.
- Customer live order tracker; **4-digit pickup code** (no QR); attendant types the code
  (customer or the rider they sent) → **released/completed** → store balance released.
- No-show cron: 48h after the sub-order's **latest ready time** → **forfeited, no refund**,
  store payout released, stock restored; loud policy copy at checkout + reminder notifications
  at 24h/4h. Top-up that re-readies a sub-order **restarts** that clock.
- Customer-requested refunds with the ₦100 customer-borne fee.
- **Done when:** the full loop — pay, pick with one item unavailable, free refund lands in
  wallet, top-up without a second ₦800, handover by 4-digit code — works end to end in test mode.

### Sprint 5 — Money out & notifications
- Customer withdrawal (₦50 fee) and store withdrawal via Paystack Transfers, with
  transfer-failure reversal handling.
- Phone OTP via Termii; Expo push notifications wired to every order/money event (+ email, and
  SMS for OTP/"order ready" only); notification preference toggles. Top-up → store ping.
- Store ratings (post-handover prompt), store rating display.
- First **TestFlight / Play internal-testing builds** submitted — start Apple review exposure
  early. Listings named **Stillgood**.
- **Done when:** money can leave the system safely and every state change notifies the right
  person on a real device.

### Sprint 6 — Admin dashboard
- Money charts with all time buckets (15m → 1y) + calendar range picker; withdrawals per day;
  dormant balance.
- Store registration/approval flow finished (from Sprint 1's minimal version) + suspension.
- All-orders explorer with per-store breakdown and the order's `order_payments` / top-up
  history; store health table (availability rate, median time-to-confirm/ready).
- Support tools: user/order lookup, manual wallet adjustment (reason required, double-logged);
  config panel (fees, surcharge base/increment, commission, pickup window, min days-to-expiry).
- **Done when:** you can answer "how much did we make yesterday and which store is slacking?"
  in two clicks.

### Sprint 7 — Polish, store review & pilot
- App-store submission proper: listings for **Stillgood**, screenshots, privacy labels,
  Apple/Google review cycles (budget for one rejection round each — common on first submission).
- Settings completeness: change email/phone/password, delete account (with wallet/order
  guards), About Us, Rate Us (store-review deep links).
- Trust & safety: report listing, admin takedown, rate limits; empty/loading/error states
  everywhere; T&Cs and privacy pages (forfeiture, top-up, and fee policies explicit).
- Performance pass on low-end Android + 3G; image caching; offline-tolerant listing upload.
- Seed the pilot: onboard 3–5 real Abuja stores, list inventory with them, soft launch to a
  small customer group via TestFlight/Play internal track before public listing.
- **Done when:** a stranger can use both apps without you on the phone, and both stores have
  approved the apps.

### Post-launch backlog (explicitly deferred)
Restaurants with same-day windows · **platform-managed delivery** (launch is pickup only;
customer may send their own rider) · rewards/loyalty · Flutterwave · recommendation ML ·
multi-admin roles & permissions · automated CAC verification · SEO marketing site.

## Build-order rationale

Money (Sprint 3) before fulfillment (Sprint 4) because fulfillment *moves* money and needs the
ledger to exist — and because top-up is a second charge against the same order, it belongs in
Sprint 3 next to `order_payments`. Admin (Sprint 6) mostly late because during Sprints 1–5 you
*are* the admin dashboard via the Supabase table editor — except store registration, which
lands earlier in minimal form because Sprint 1 depends on it. App-store review is the one
externally-imposed delay in the whole plan, which is why builds go to TestFlight in Sprint 5,
two sprints before launch.
