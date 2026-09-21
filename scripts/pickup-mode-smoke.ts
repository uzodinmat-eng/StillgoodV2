/**
 * One-off verification for the pickup-mode checkout slice:
 * 1. Store pickup costs ₦0 for a single store.
 * 2. Hub pickup costs ₦800 for a single store.
 * 3. Multi-store orders remain hub-based.
 * Run: npx tsx scripts/pickup-mode-smoke.ts
 */
import { calculatePickupFee, calculatePickupFeeForMode } from "../src/lib/fees";

async function main() {
  console.log("store pickup 1 store:", calculatePickupFeeForMode(1, "store"), "(expect 0)");
  console.log("hub pickup 1 store:", calculatePickupFeeForMode(1, "hub"), "(expect 800)");
  console.log("legacy fee 1 store:", calculatePickupFee(1), "(expect 800)");
  console.log("hub pickup 2 stores:", calculatePickupFeeForMode(2, "hub"), "(expect 1300)");
}

main().catch((error) => {
  console.error("PICKUP MODE CHECK FAILED", error);
  process.exit(1);
});
