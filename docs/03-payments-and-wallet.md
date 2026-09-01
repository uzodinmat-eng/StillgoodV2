# Payments, Wallet & Financial Settlement

## 1. Currency & Payment Rails
All transactions on Stillgood are denominated in **Nigerian Naira (₦ / NGN)**.

### Supported Channels:
1. **Paystack / Flutterwave**:
   - Debit Cards (Mastercard, Visa, Verve).
   - Bank Transfers (Dynamic Virtual Accounts with instant webhook verification).
   - USSD (*737#, *894#, *966#, etc.).
2. **Direct Instant Bank Transfer**:
   - Moniepoint / OPay dedicated reservation account.
3. **Stillgood Wallet**:
   - Prepaid balance funded via card or refunds from unavailable items.

---

## 2. Fee Structure (`src/lib/fees.ts`)

| Component | Standard Rate | Description |
|---|---|---|
| **Platform Convenience Fee** | ₦250 flat or 3% (whichever is lower, min ₦100) | Covers verification infrastructure, SMS alerts, and app hosting |
| **Merchant Commission** | 12% of discounted sale price | Deducted upon successful pickup confirmation |
| **Customer Savings** | \(\sum (\text{Original Price} - \text{Current Price}) \times \text{Qty}\) | Calculated transparently on checkout summary |

---

## 3. Pickup Escrow & Settlement Mechanics
1. **Customer Places Order**: Funds are held in Stillgood Escrow.
2. **Order Code Generation**: A unique 5-character order ID (`SG-XXXXX`) + 4-digit pickup verification PIN is generated.
3. **Store Inspection & Handover**:
   - Customer arrives at the supermarket pickup counter.
   - Merchant inputs or scans the `SG-XXXXX` and verifies the 4-digit PIN.
   - Merchant hands over the inspected goods.
4. **Instant Settlement Trigger**:
   - Escrow releases the merchant portion (88%) to the store's payout ledger.
   - Payouts are batched daily to merchant corporate bank accounts in Abuja.
