# Stillgood

Nigeria's near-expiry grocery rescue marketplace. Save 30%–75% on short-dated stock from partner supermarkets. Order online, pick up at the store or send a dispatch rider.

`SG-XXXXX` is the **order number** (e.g. `SG-72941`). The 4-digit PIN is the counter handoff. Neither is a login.

---

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

**Buyer login (this build):** navbar user icon → `/account` → WhatsApp number → OTP **`123456`**. Guest checkout still works without an account. Wallet starts at ₦0.

---

## What this repo does

- Browse surplus deals with weekly **2.5% drift** pricing.
- Filter by store and category. Sort by price, upload time, expiry, or discount (asc/desc).
- Cookie cart and mocked Nigerian payment rails (Paystack / Flutterwave / transfer / wallet).
- **Single-store cart:** pickup locked to that supermarket.
- **Multi-store cart:** choose one hub; fleet runs **noon (12:00 PM)** and **evening (5:00 PM)** Lagos batches.
- Pickup pass with order number + PIN. Rider or shopper can collect.
- Buyer account: orders, savings, mocked Stillgood Wallet.
- Store reviews modal. Lagos is listed as Coming Soon.

Stack: Next.js App Router, TypeScript, Tailwind, cookies + server actions. No database and no live SMS/payments yet.

---

## Project structure

```
├── docs/
│   ├── 01-product-spec.md
│   ├── 02-data-model.md
│   ├── 03-payments-and-wallet.md
│   ├── 04-sprint-plan.md      ← what is done / what is next
│   └── 05-open-questions.md
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── account/           # buyer home (server-loaded session)
│   │   ├── stores/
│   │   ├── order/[id]/        # pickup pass
│   │   └── impact/
│   ├── components/
│   │   ├── Navbar.tsx         # user icon → /account
│   │   ├── AuthModal.tsx
│   │   ├── AccountView.tsx
│   │   ├── CheckoutModal.tsx  # real consolidation + session prefill
│   │   ├── StoreReviewsModal.tsx
│   │   └── …
│   └── lib/
│       ├── pricing.ts         # 2.5% weekly drift
│       ├── fees.ts
│       ├── fulfillment.ts     # single-store vs noon/evening batches
│       ├── auth.ts            # OTP session (dev code 123456)
│       ├── auth-utils.ts
│       ├── actions.ts         # cart + createOrder
│       ├── data.ts
│       └── types.ts
└── package.json
```

See [`docs/04-sprint-plan.md`](docs/04-sprint-plan.md) for the next slice (`/staff/verify` or a product detail page). Ask before a database, live Paystack, or Termii.

---

## Drift pricing (`src/lib/pricing.ts`)

- Base markdown from retail (e.g. 30% off).
- Extra 2.5% off per week since listing.
- Floor: max 85% off.

---

## Partner hubs (Abuja)

- Grand Square — Central Area
- H-Medix — Wuse II
- Next Cash & Carry — Jahi
- 4U Supermarket — Wuse II
- Sahad Stores — Central Area
- Market Square — Jabi
- Lagos — Coming Soon
