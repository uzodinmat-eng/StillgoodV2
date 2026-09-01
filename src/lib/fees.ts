import { PopulatedCartItem } from "./types";

/**
 * Platform convenience fee calculation
 * ₦250 flat or 3% of subtotal (whichever is lower), with minimum of ₦150
 */
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
  const platformFee = calculatePlatformFee(subtotal);
  const total = subtotal + platformFee;

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
