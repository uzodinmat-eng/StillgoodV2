# Stillgood Product Specification

## 1. Executive Summary
**Stillgood** is an Abuja-first, near-expiry grocery marketplace designed to reduce retail food waste and offer steep discounts (30% to 75% off) to Nigerian households on quality groceries approaching their Best-Before or Expiration dates.

- **Market**: Abuja / Federal Capital Territory (FCT), Nigeria.
- **Fulfillment Model**: Store Pickup Only (no delivery logistics overhead, ensures cold-chain inspection prior to handoff).
- **Order Identifiers**: Unique identifiers formatted as `SG-XXXXX` (e.g., `SG-48291`).
- **Currency**: Nigerian Naira (₦).

---

## 2. Core Value Proposition
1. **For Consumers**:
   - Save 30%–75% on premium brand groceries (cereal, dairy, canned foods, beverages, condiments, snacks, pasta).
   - Transparent freshness indicators ("Best Before in 6 days", freshness health score, weekly price decay).
   - Easy pickup at trusted neighborhood supermarkets (Wuse II, Maitama, Garki, Jabi, Utako, Central Area).
2. **For Supermarkets & Merchants**:
   - Recover revenue on surplus, overstock, and short-dated inventory that would otherwise be discarded or written off as shrink.
   - Attract foot traffic directly to their retail branches.
   - Automated pricing markdown schedule (2.5% weekly drift algorithm).

---

## 3. Product Principles
- **Clarity over Ambiguity**: Every product card clearly displays the original price, the discounted Stillgood price, the exact expiry/best-before date, and the days remaining.
- **NAFDAC Compliance & Food Safety**: Differentiating strictly between "Best Before" (quality indicator) and "Use By / Expiry Date" (safety threshold). Items are removed 24-48 hours before mandatory safety cutoff.
- **Fast, Reliable In-Store Pickup**: Customers receive a pickup verification PIN & QR code with their `SG-XXXXX` order number. Store staff verify the order before handoff.
- **Dynamic Price Drift**: Automated 2.5% weekly markdown (decay) to incentivize rapid clearance as dates approach.

---

## 4. Key User Journeys
1. **Discovery & Browsing**:
   - Browse by Category (Dairy, Bakery, Pantry, Drinks, Snacks, Canned, Frozen).
   - Filter by Abuja Store / Neighborhood (e.g. Grand Square Central Area, H-Medix Wuse II, Next Cash & Carry Jahi, Sahad Stores, 4U Supermarket).
   - Real-time search with instant autocomplete.
2. **Dynamic Pricing & Urgency**:
   - Visual badges showing "Drops 2.5% every Monday" or current decay tier.
   - Low stock count ("Only 3 left in stock").
3. **Cart & Reservation**:
   - Cookie-backed server-side cart for instant responsiveness across tabs.
   - Item quantity adjustments with automatic fee calculations.
4. **Checkout & Scheduling**:
   - Select pickup day and time window (e.g., Today 4:00 PM – 7:00 PM, Tomorrow 10:00 AM – 1:00 PM).
   - Payment via Nigerian payment rails (Paystack, Flutterwave, Moniepoint direct transfer, or Stillgood Wallet).
5. **Collection & Verification**:
   - Immediate confirmation screen and receipt with `SG-XXXXX` code and pickup instructions.
   - Order history and savings impact counter.
