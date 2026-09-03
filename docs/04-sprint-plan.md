# Stillgood Sprint & Development Roadmap

## Sprint 1: Abuja Core MVP (Completed)
- [x] Initial Next.js App Router scaffold.
- [x] Data models for Products, Stores, Categories, and Orders.
- [x] Pricing drift logic (2.5% weekly markdown).
- [x] Cookie-backed cart session with server actions.
- [x] Order generation format: `SG-XXXXX`.

---

## Sprint 2: Modern Design Overhaul & Discovery UX (Current)
- [x] High-end, modern Nigerian grocery e-commerce design (Emerald/Forest/Amber/Zinc palette).
- [x] Real-time search autocomplete dropdown with instant product & category jumps.
- [x] Dynamic 2.5% weekly drift pricing visual timeline/decay curve indicators on product cards.
- [x] Category visual tiles with item counts and filter badges.
- [x] Abuja store selector with neighborhood tags (Wuse II, Maitama, Garki, Jabi, Utako, Central Area).
- [x] Slide-out cookie-backed Cart drawer with instant quantity modifications.
- [x] Modern Checkout modal/page with Abuja pickup slot selection and payment mock.
- [x] Order confirmation view with printable `SG-XXXXX` pickup pass and verification PIN.
- [x] Store detail pages and interactive catalog filtering (Sort by discount %, price, days left).

---

## Sprint 3: Merchant Inventory Portal (Upcoming)
- [ ] Store staff portal for quick item listing with camera barcode scanning.
- [ ] Bulk CSV import for POS inventory dumps.
- [ ] Order verification scanner (entering `SG-XXXXX` and confirming pickup code).

---

## Sprint 4: Notifications & Geo-features (Future)
- [ ] Termii SMS & WhatsApp notification integration for pickup reminders.
- [ ] Abuja neighborhood distance calculator & interactive map view.

---

## Updates since original (do not replace the plan above)

Shipped on top of Sprint 2; Sprint 3–4 items are still upcoming.

- Store deal counts are computed from the catalog, not hardcoded. Pickup copy includes dispatch riders. Phone numbers removed from store cards. Branding is Stillgood Marketplace / Nigeria; Lagos is Coming Soon. Store ratings open a reviews modal. Sort is Price / Time of upload / Time of expiry / Biggest discount with an Asc/Desc toggle. Storage filter removed.
- Hub consolidation is enforced in checkout (`src/lib/fulfillment.ts`): one store locks pickup to that store; two or more stores require a destination hub and only the noon (12:00 PM) or evening (5:00 PM) Lagos batches. Pickup pass stores `requiresConsolidation`, `originStores`, `hubBatch`.
- Product image discount badge is emerald (still `-X%` + down arrow), not red.
- Buyer login exists: navbar user icon → `/account`. WhatsApp OTP; **dev code is always `123456`**. Guest checkout still works. Account shows orders (`SG-XXXXX` is the order number only), savings, mocked wallet (₦0). Wallet pay requires login and sufficient balance.
- `SG-XXXXX` remains the order labelling format, not a login method.
- Product detail pages at `/product/[slug]`: photo, drift schedule, pickup store, NAFDAC/stock, quantity add-to-cart. Cards, search hits, and basket names link here. Related deals sit at the bottom.
- Next slices still need a go-ahead. Ask before DB, live Paystack, Termii, or a merchant portal.
