import { DateType, DriftScheduleStep, Product, UrgencyLevel } from "./types";

/**
 * Formats a number to Nigerian Naira currency display
 * e.g., 3500 -> "₦3,500"
 */
export function formatNaira(amount: number): string {
  const rounded = Math.round(amount);
  return `₦${rounded.toLocaleString("en-NG")}`;
}

/**
 * Calculates days remaining from today (or reference date) to target date
 */
export function getDaysRemaining(targetDateStr: string, fromDate = new Date()): number {
  const target = new Date(targetDateStr);
  const startOfToday = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  
  const diffTime = startOfTarget.getTime() - startOfToday.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Determines urgency level based on days remaining
 */
export function getUrgencyLevel(daysRemaining: number): UrgencyLevel {
  if (daysRemaining <= 3) return "critical";
  if (daysRemaining <= 7) return "urgent";
  if (daysRemaining <= 14) return "moderate";
  return "safe";
}

/**
 * Returns human-friendly badge properties for urgency level
 */
export function getUrgencyBadge(daysRemaining: number, dateType: DateType = "best_before") {
  const urgency = getUrgencyLevel(daysRemaining);
  const typeLabel = dateType === "best_before" ? "Best Before" : dateType === "use_by" ? "Use By" : "Expires";

  switch (urgency) {
    case "critical":
      return {
        label: `${typeLabel}: ${daysRemaining === 0 ? "Today" : daysRemaining === 1 ? "1 day left" : `${daysRemaining} days left`}`,
        tag: "Final Clearance",
        bgColor: "bg-rose-50 text-rose-700 border-rose-200",
        badgeColor: "bg-rose-600 text-white",
        textColor: "text-rose-600",
        pulse: true,
      };
    case "urgent":
      return {
        label: `${typeLabel}: ${daysRemaining} days left`,
        tag: "Super Deal",
        bgColor: "bg-amber-50 text-amber-800 border-amber-200",
        badgeColor: "bg-amber-500 text-white",
        textColor: "text-amber-700",
        pulse: false,
      };
    case "moderate":
      return {
        label: `${typeLabel}: ${daysRemaining} days left`,
        tag: "Price Dropping",
        bgColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
        badgeColor: "bg-emerald-600 text-white",
        textColor: "text-emerald-700",
        pulse: false,
      };
    default:
      return {
        label: `${typeLabel}: ${daysRemaining} days left`,
        tag: "Good Date",
        bgColor: "bg-slate-50 text-slate-700 border-slate-200",
        badgeColor: "bg-slate-700 text-white",
        textColor: "text-slate-700",
        pulse: false,
      };
  }
}

/**
 * Calculates current price applying initial base discount and weekly 2.5% drift markdown
 * 
 * Formula:
 * 1. Base markdown applied at listing: basePrice = originalPrice * (1 - baseDiscountPercent / 100)
 * 2. Weeks elapsed since listing: weeks = floor(daysElapsed / 7)
 * 3. Additional drift: driftDiscount = weeks * (weeklyDriftRate * 100)%
 * 4. Total Discount % = min(85%, baseDiscountPercent + driftDiscount)
 * 5. Current Price = originalPrice * (1 - Total Discount / 100)
 */
export function calculateDriftPrice({
  originalPrice,
  baseDiscountPercent,
  listedAt,
  weeklyDriftRate = 0.025,
  currentDate = new Date(),
}: {
  originalPrice: number;
  baseDiscountPercent: number;
  listedAt: string;
  weeklyDriftRate?: number;
  currentDate?: Date;
}): {
  currentPrice: number;
  totalDiscountPercent: number;
  driftDiscountPercent: number;
  weeksElapsed: number;
  nextDropDays: number;
} {
  const listedDate = new Date(listedAt);
  const diffTime = Math.max(0, currentDate.getTime() - listedDate.getTime());
  const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weeksElapsed = Math.floor(daysElapsed / 7);
  const daysIntoCurrentWeek = daysElapsed % 7;
  const nextDropDays = 7 - daysIntoCurrentWeek;

  const driftDiscountPercent = weeksElapsed * (weeklyDriftRate * 100);
  const totalDiscountPercent = Math.min(85, Math.round((baseDiscountPercent + driftDiscountPercent) * 10) / 10);
  
  const currentPrice = Math.round(originalPrice * (1 - totalDiscountPercent / 100));

  return {
    currentPrice,
    totalDiscountPercent,
    driftDiscountPercent,
    weeksElapsed,
    nextDropDays,
  };
}

/**
 * Generates dynamic 4-week drift pricing timeline schedule for UI modal & visual decay curve
 */
export function generateDriftSchedule({
  originalPrice,
  baseDiscountPercent,
  listedAt,
  expiryDate,
  weeklyDriftRate = 0.025,
}: {
  originalPrice: number;
  baseDiscountPercent: number;
  listedAt: string;
  expiryDate: string;
  weeklyDriftRate?: number;
}): DriftScheduleStep[] {
  const listed = new Date(listedAt);
  const now = new Date();
  const expiry = new Date(expiryDate);
  
  const steps: DriftScheduleStep[] = [];
  
  // Create 4 weekly projection steps
  for (let week = 0; week < 4; week++) {
    const stepDate = new Date(listed);
    stepDate.setDate(listed.getDate() + week * 7);
    
    // Stop if step goes past expiry
    if (stepDate.getTime() > expiry.getTime()) break;

    const discountPercent = Math.min(85, Math.round((baseDiscountPercent + week * (weeklyDriftRate * 100)) * 10) / 10);
    const price = Math.round(originalPrice * (1 - discountPercent / 100));
    
    const isCurrent = Math.abs(now.getTime() - stepDate.getTime()) < 7 * 24 * 60 * 60 * 1000 && now.getTime() >= stepDate.getTime();
    const isPast = now.getTime() >= stepDate.getTime() + 7 * 24 * 60 * 60 * 1000;
    const isFuture = now.getTime() < stepDate.getTime();

    const formattedDate = stepDate.toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
    });

    let label = `Week ${week + 1}`;
    if (week === 0) label = "Initial Listing (Base)";
    else label = `Drop #${week} (+2.5%)`;

    steps.push({
      date: formattedDate,
      label,
      discountPercent,
      price,
      isCurrent,
      isPast,
      isFuture,
    });
  }

  // Ensure at least the current step is marked
  const hasCurrent = steps.some((s) => s.isCurrent);
  if (!hasCurrent && steps.length > 0) {
    steps[0].isCurrent = true;
  }

  return steps;
}

/**
 * Calculates total customer savings
 */
export function calculateSavings(originalPrice: number, currentPrice: number, quantity = 1): number {
  return Math.max(0, (originalPrice - currentPrice) * quantity);
}
