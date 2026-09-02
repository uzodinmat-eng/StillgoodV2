# Stillgood Sprint & Development Roadmap

Standing rules: keep the lightweight web slice (cookies + server actions). Pause and commit after each slice. Ask before Postgres, live Paystack/Flutterwave, Termii, or a full merchant portal. `SG-XXXXX` is the **order number format only**, not a login.

---

## Sprint 1: Core MVP (Completed)
- [x] Initial Next.js App Router scaffold.
- [x] Data models for Products, Stores, Categories, and Orders.
- [x] Pricing drift logic (2.5% weekly markdown).
- [x] Cookie-backed cart session with server actions.
- [x] Order generation format: `SG-XXXXX` plus 4-digit pickup PIN.

---

## Sprint 2: Marketplace UX (Completed)
- [x] Nigerian grocery e-commerce design (emerald / amber / slate).
- [x] Search autocomplete (products, categories, stores).
- [x] 2.5% weekly drift timeline on product cards and modal.
- [x] Category tiles and store selector (Abuja hubs; Lagos Coming Soon).
- [x] Cart drawer, checkout, printable pickup pass.
- [x] Store directory, store detail, impact page.
- [x] Store reviews modal; dynamic deal counts; dispatch-rider pickup copy.
- [x] Sort: Price / Time of upload / Time of expiry / Biggest discount + Asc/Desc. No storage filter.

---

## Sprint 2b: Fulfillment + Buyer Account (Completed)
- [x] Real hub consolidation in checkout ([`src/lib/fulfillment.ts`](../src/lib/fulfillment.ts)):
  - One store → pickup locked to that store; four same-day windows.
  - Two or more stores → pick a destination hub; noon (12:00 PM) or evening (5:00 PM) Lagos batches with same-day cutoffs.
  - Pickup pass records origin stores vs hub and `hubBatch`.
- [x] Emerald discount badge on product photos (keep `-X%` + down arrow).
- [x] Buyer WhatsApp OTP login (dev code always `123456`). Session cookie. Guest checkout still works.
- [x] [`/account`](../src/app/account/page.tsx): name, phone, orders as `SG-XXXXX` links, lifetime savings, mocked wallet (₦0). Navbar user icon links here.
- [x] Wallet payment at checkout only if logged in and balance covers the total.

---

## Sprint 3: Next lightweight slice (Do this next)
- [ ] Staff pickup verification at `/staff/verify`: enter order number `SG-XXXXX` + 4-digit PIN, mark collected.
- [ ] Product detail page (`/product/[slug]`) with drift schedule and add-to-cart.

---

## Later (ask before starting)
- [ ] Store staff listing portal, barcode scan, CSV import.
- [ ] Termii SMS / WhatsApp pickup reminders.
- [ ] Live Paystack / Flutterwave.
- [ ] Postgres (or other) instead of cookies.
- [ ] Neighborhood map / distance.
