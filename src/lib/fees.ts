import { PopulatedCartItem } from "./types";

/**
 * Platform convenience fee calculation
 * ₦800 base for the first store + ₦500 for each additional store.
 */
export const BASE_PICKUP_FEE = 800;
export const ADDITIONAL_STORE_PICKUP_FEE = 500;

export function calculatePickupFee(storeCount: number): number {
  if (storeCount <= 0) return 0;
  return BASE_PICKUP_FEE + ADDITIONAL_STORE_PICKUP_FEE * (storeCount - 1);
}

/**
 * Apology discount for paying with the Stillgood Wallet: the base
 * single-store pickup fee (₦800) is waived. Multi-store surcharges
 * (₦500 per extra store) still apply in full. Recorded as an order
 * discount — never a wallet credit.
 */
export function calculateWalletDiscount(storeCount: number): number {
  if (storeCount <= 0) return 0;
  return BASE_PICKUP_FEE;
}

export function calculatePlatformFee(subtotal: number): number {
  if (subtotal === 0) return 0;
  const percentageFee = Math.round(subtotal * 0.03);
  return Math.max(150, Math.min(250, percentageFee));
}

/**
 * Calculates full order totals, savings, items count, and store grouping
 */
export function calculateOrderSummary(items: PopulatedCartItem[]) {
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.itemTotal, 0);
  const originalSubtotal = items.reduce((acc, item) => acc + item.originalItemTotal, 0);
  const savingsTotal = Math.max(0, originalSubtotal - subtotal);
  // The prototype platform fee is replaced by the documented picking surcharge.
  const platformFee = 0;
  const pickupFee = calculatePickupFee(new Set(items.map((item) => item.store.id)).size);
  const total = subtotal + pickupFee;

  // Extract unique stores
  const storeMap = new Map();
  items.forEach((item) => {
    if (!storeMap.has(item.store.id)) {
      storeMap.set(item.store.id, item.store);
    }
  });
  const storesInvolved = Array.from(storeMap.values());

  return {
    items,
    itemCount,
    subtotal,
    originalSubtotal,
    savingsTotal,
    platformFee,
    pickupFee,
    total,
    storesInvolved,
  };
}

/**
 * Calculates merchant settlement payout (88% net after 12% Stillgood platform commission)
 */
export function calculateMerchantPayout(discountedSubtotal: number, commissionRate = 0.12): {
  merchantPayout: number;
  stillgoodCommission: number;
} {
  const stillgoodCommission = Math.round(discountedSubtotal * commissionRate);
  const merchantPayout = discountedSubtotal - stillgoodCommission;
  return {
    merchantPayout,
    stillgoodCommission,
  };
}
