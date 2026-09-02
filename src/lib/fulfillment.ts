import { Store } from "./types";

export type HubBatch = "noon" | "evening";

export interface OriginStoreRef {
  id: string;
  name: string;
  area: string;
}

export interface PickupSlot {
  value: string;
  label: string;
  hubBatch: HubBatch | null;
  cutoffHour?: number;
}

export const LAGOS_TIME_ZONE = "Africa/Lagos";

export const DIRECT_PICKUP_SLOTS: PickupSlot[] = [
  { value: "10:00 AM – 1:00 PM", label: "Morning: 10:00 AM – 1:00 PM", hubBatch: null },
  { value: "1:00 PM – 4:00 PM", label: "Afternoon: 1:00 PM – 4:00 PM", hubBatch: null },
  { value: "4:00 PM – 7:00 PM", label: "Evening: 4:00 PM – 7:00 PM", hubBatch: null },
  { value: "7:00 PM – 9:00 PM", label: "Late Evening: 7:00 PM – 9:00 PM", hubBatch: null },
];

export const CONSOLIDATION_BATCHES: PickupSlot[] = [
  {
    value: "1:00 PM – 4:00 PM",
    label: "Noon batch (12:00 PM) · pickup 1:00 PM – 4:00 PM",
    hubBatch: "noon",
    cutoffHour: 11,
  },
  {
    value: "5:30 PM – 9:00 PM",
    label: "Evening batch (5:00 PM) · pickup 5:30 PM – 9:00 PM",
    hubBatch: "evening",
    cutoffHour: 16,
  },
];

export function needsConsolidation(storesInvolved: Pick<Store, "id">[]): boolean {
  return storesInvolved.length > 1;
}

export function getLagosDateString(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: LAGOS_TIME_ZONE });
}

export function getLagosHour(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LAGOS_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "0";
  return parseInt(hour, 10);
}

export function addCalendarDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day) + days * 24 * 60 * 60 * 1000;
  const next = new Date(utc);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getAvailablePickupSlots(options: {
  consolidating: boolean;
  pickupDate: string;
  now?: Date;
}): PickupSlot[] {
  const { consolidating, pickupDate, now = new Date() } = options;

  if (!consolidating) {
    return DIRECT_PICKUP_SLOTS;
  }

  const today = getLagosDateString(now);
  const hour = getLagosHour(now);

  if (pickupDate > today) {
    return CONSOLIDATION_BATCHES;
  }

  if (pickupDate < today) {
    return [];
  }

  return CONSOLIDATION_BATCHES.filter((slot) => hour < (slot.cutoffHour ?? 24));
}

export function nextAvailablePickupDate(
  consolidating: boolean,
  now: Date = new Date()
): string {
  const today = getLagosDateString(now);
  const todaySlots = getAvailablePickupSlots({
    consolidating,
    pickupDate: today,
    now,
  });
  if (todaySlots.length > 0) return today;
  return addCalendarDays(today, 1);
}

export function getHubBatchForSlot(
  slotValue: string,
  consolidating: boolean
): HubBatch | null {
  if (!consolidating) return null;
  const match = CONSOLIDATION_BATCHES.find((slot) => slot.value === slotValue);
  return match?.hubBatch ?? null;
}

export function isValidPickupSlot(options: {
  consolidating: boolean;
  pickupDate: string;
  pickupTimeSlot: string;
  now?: Date;
}): boolean {
  return getAvailablePickupSlots(options).some(
    (slot) => slot.value === options.pickupTimeSlot
  );
}

export function toOriginStoreRefs(
  stores: Pick<Store, "id" | "name" | "area">[]
): OriginStoreRef[] {
  return stores.map((store) => ({
    id: store.id,
    name: store.name,
    area: store.area,
  }));
}

export function hubBatchLabel(batch: HubBatch | null | undefined): string | null {
  if (batch === "noon") return "Noon consolidation batch (12:00 PM)";
  if (batch === "evening") return "Evening consolidation batch (5:00 PM)";
  return null;
}
