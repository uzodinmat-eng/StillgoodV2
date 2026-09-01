# Stillgood 🛒🇳🇬

> **Abuja's Near-Expiry Grocery Rescue Marketplace**  
> Save 30%–75% on surplus and short-dated groceries from top supermarkets across Abuja/FCT. Pickup only.

---

## 🌟 Overview
**Stillgood** connects price-conscious shoppers and families in Abuja with verified supermarkets to buy high-quality groceries approaching their Best-Before or Expiry dates at steep discounts. 

### Highlights
- 📍 **Abuja/FCT Pickup Only**: Collect orders directly at verified supermarkets in Wuse II, Maitama, Garki, Jabi, Utako, and Central Area.
- 📉 **Weekly 2.5% Drift Pricing**: Automated price markdown algorithm that lowers prices by 2.5% every week as items approach their best-before date.
- 🆔 **Order Number System**: Unique order codes formatted as `SG-XXXXX` (e.g. `SG-72941`) with 4-digit verification PINs for seamless store handoffs.
- 🍪 **Cookie-Backed Cart**: Fast, resilient cart session backed by cookies and Next.js Server Actions.
- 🔍 **Live Autocomplete Search & Filters**: Instant search dropdown, store/category pills, and sort controls (Discount %, Price, Days Left).

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
│   │   └── api/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── SearchAutocomplete.tsx
│   │   ├── CategoryTiles.tsx
│   │   ├── StoreSelector.tsx
│   │   ├── ProductCard.tsx
│   │   ├── DriftPricingModal.tsx
│   │   ├── CartDrawer.tsx
│   │   └── CheckoutModal.tsx
│   └── lib/
│       ├── pricing.ts      # 2.5% weekly drift calculations & expiry urgency
│       ├── fees.ts         # Platform fees & customer savings calculators
│       ├── actions.ts      # Cookie-backed cart and order server actions
│       ├── data.ts         # Mock Abuja stores, categories, and products
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

## 🇳🇬 Supported Abuja Pickup Hubs
- **Grand Square Supermarket** – Central Business District
- **H-Medix Pharmacy & Supermarket** – Wuse II & Gwarinpa
- **Next Cash & Carry** – Jahi / Kado
- **4U Supermarket (formerly Amigo)** – Wuse II
- **Sahad Stores** – Central Area & Garki II
- **Market Square** – Apo & Jabi Lake Mall
