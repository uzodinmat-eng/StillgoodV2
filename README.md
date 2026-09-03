# Stillgood 🛒🇳🇬

> **Nigeria's Near-Expiry Grocery Rescue Marketplace**  
> Save 30%–75% on surplus and short-dated groceries from top verified supermarkets. Order online and pick up at the store or send a dispatch rider.

---

## 🌟 Overview
**Stillgood** connects price-conscious shoppers and families across Nigeria with verified supermarkets to buy high-quality groceries approaching their Best-Before or Expiry dates at steep discounts. 

### Highlights
- 📍 **Store & Rider Pickup**: Order online and collect at store customer service counters or send any dispatch rider with your `SG-XXXXX` code and 4-digit PIN.
- 🚚 **Multi-Store Hub Consolidation**: Orders spanning multiple partner stores are consolidated twice daily (12:00 PM and 5:00 PM batches) to your chosen central pickup hub.
- 📉 **Weekly 2.5% Drift Pricing**: Automated price markdown algorithm that lowers prices by 2.5% every week as items approach their best-before date.
- 🆔 **Order Number System**: Unique order codes formatted as `SG-XXXXX` (e.g. `SG-72941`) with 4-digit verification PINs for seamless store handoffs.
- ⭐ **Verified Store Reviews**: Inspect ratings and real feedback from shoppers and dispatch riders.
- 🍪 **Cookie-Backed Cart**: Fast, resilient cart session backed by cookies and Next.js Server Actions.
- 🔍 **Simplified Search & Filter Controls**: Clean category buttons, store selection, and Asc/Desc sort toggles across Price, Upload Time, Expiry, and Discount.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run the development server (configured on port 43147)
npm run dev

# 3. Open in your browser
http://localhost:43147
```

---

## 📂 Project Structure

```
├── docs/
│   ├── 01-product-spec.md
│   ├── 02-data-model.md
│   ├── 03-payments-and-wallet.md
│   ├── 04-sprint-plan.md
│   └── 05-open-questions.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── stores/
│   │   ├── order/
│   │   └── impact/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── SearchAutocomplete.tsx
│   │   ├── CategoryTiles.tsx
│   │   ├── StoreFilterBar.tsx
│   │   ├── ProductCard.tsx
│   │   ├── DriftPricingModal.tsx
│   │   ├── StoreReviewsModal.tsx
│   │   ├── CartDrawer.tsx
│   │   └── CheckoutModal.tsx
│   └── lib/
│       ├── pricing.ts      # 2.5% weekly drift calculations & expiry urgency
│       ├── fees.ts         # Platform fees & customer savings calculators
│       ├── actions.ts      # Cookie-backed cart and order server actions
│       ├── data.ts         # Mock stores, categories, products, and reviews
│       └── utils.ts
└── package.json
```

---

## 💡 Pricing Drift Algorithm (`src/lib/pricing.ts`)
Items listed on Stillgood feature a dynamic price decay schedule:
- **Base Discount**: Initial markdown from retail (e.g., 30% off).
- **Weekly Drift**: Additional 2.5% markdown per week elapsed since listing.
- **Urgency Decay**: Enhanced markdown when fewer than 7 days remain until Best-Before date.
- **Floor Protection**: Maximum allowed discount capped at 85% to preserve retail margin.

---

## 🇳🇬 Certified Partner Supermarket Hubs
- **Grand Square Supermarket & Bakery** – Central Business District, Abuja
- **H-Medix Pharmacy & Supermarket** – Wuse II, Abuja
- **Next Cash & Carry** – Jahi / Kado, Abuja
- **4U Supermarket** – Wuse II, Abuja
- **Sahad Stores** – Central Area, Abuja
- **Market Square** – Jabi Lake Mall, Abuja
- *Lagos (Coming Soon)*

---

## Updates since original

Added after the structure above; originals left as-is.

- Buyer login: navbar user icon goes to `/account`. WhatsApp OTP; this build accepts **`123456`**. Guest checkout still works. `SG-XXXXX` is only the order number.
- New files: `src/lib/auth.ts`, `src/lib/auth-utils.ts`, `src/lib/fulfillment.ts`, `src/app/account/`, `src/components/AuthModal.tsx`, `src/components/AccountView.tsx`.
- Checkout now enforces hub consolidation (not copy-only). See `src/lib/fulfillment.ts`.
- Discount badge on product photos is green, not red.
- Product detail: `/product/[slug]` (`src/app/product/[slug]/`, `src/components/ProductDetailView.tsx`). Marketplace cards, search, and basket item names open it.
