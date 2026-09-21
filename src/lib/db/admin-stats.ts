import { asInt, dateOnly, query, queryOne } from "./client";

// Status buckets locked by the admin-desk plan: pending vs confirmed orders,
// confirmed purchases (available/picked_up items), 12% commission on confirmed subtotal.
export const PENDING_ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "awaiting_store_confirmation",
];

export const CONFIRMED_ORDER_STATUSES = [
  "confirmed",
  "partially_fulfilled",
  "ready_for_pickup",
  "picked_up",
];

export const CONFIRMED_ITEM_STATUSES = ["available", "picked_up"];

export const ADMIN_STATS_COMMISSION_RATE = 0.12;

export interface AdminStatsFilters {
  from?: string;
  to?: string;
  storeId?: string;
  area?: string;
}

export interface StoreOrderStat {
  storeId: string;
  storeName: string;
  area: string;
  orderCount: number;
  revenue: number;
}

export interface AreaOrderStat {
  area: string;
  orderCount: number;
  revenue: number;
}

export interface DailyStat {
  date: string;
  orders: number;
  revenue: number;
  pickupFees: number;
  refunds: number;
}

export interface AdminStats {
  walletTotal: number;
  pendingOrders: number;
  confirmedOrders: number;
  pickupFeeTotal: number;
  confirmedPurchaseTotal: number;
  refundTotal: number;
  confirmedItemCount: number;
  unconfirmedItemCount: number;
  commission: number;
  ordersByStore: StoreOrderStat[];
  ordersByArea: AreaOrderStat[];
  dailySeries: DailyStat[];
}

// Date range always filters orders.created_at; callers pass ISO bounds.
function orderWhere(
  filters: AdminStatsFilters,
  alias: string
): { clause: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];
  if (filters.from) {
    params.push(filters.from);
    conds.push(`${alias}.created_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conds.push(`${alias}.created_at <= $${params.length}`);
  }
  if (filters.storeId) {
    params.push(filters.storeId);
    conds.push(`${alias}.store_id = $${params.length}`);
  }
  if (filters.area) {
    params.push(filters.area);
    conds.push(`${alias}.store_area = $${params.length}`);
  }
  return { clause: conds.length > 0 ? `where ${conds.join(" and ")}` : "", params };
}

// Item/refund queries join through orders so the same range applies, but the
// store filter uses order_items.store_id (per-item precision for multi-store orders).
function itemJoinWhere(
  filters: AdminStatsFilters
): { clause: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];
  if (filters.from) {
    params.push(filters.from);
    conds.push(`o.created_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conds.push(`o.created_at <= $${params.length}`);
  }
  if (filters.storeId) {
    params.push(filters.storeId);
    conds.push(`oi.store_id = $${params.length}`);
  }
  if (filters.area) {
    params.push(filters.area);
    conds.push(`o.store_area = $${params.length}`);
  }
  return { clause: conds.length > 0 ? `and ${conds.join(" and ")}` : "", params };
}

export async function getAdminStats(
  filters: AdminStatsFilters = {}
): Promise<AdminStats> {
  // Customer wallet balances are global (not scoped to store/area/date).
  const walletRow = await queryOne<{ total: number | string }>(
    `select coalesce(sum(wallet_balance), 0)::int as total from public.customers`
  );

  const orderFilter = orderWhere(filters, "o");
  const statusRows = await query<{ status: string; n: number | string }>(
    `select o.status as status, count(*)::int as n
     from public.orders o ${orderFilter.clause}
     group by o.status`,
    orderFilter.params
  );
  let pendingOrders = 0;
  let confirmedOrders = 0;
  for (const row of statusRows) {
    if (PENDING_ORDER_STATUSES.includes(row.status)) pendingOrders += asInt(row.n);
    if (CONFIRMED_ORDER_STATUSES.includes(row.status)) confirmedOrders += asInt(row.n);
  }

  const feeRow = await queryOne<{ total: number | string }>(
    `select coalesce(sum(o.pickup_fee), 0)::int as total
     from public.orders o ${orderFilter.clause}`,
    orderFilter.params
  );

  const storeRows = await query<{
    store_id: string;
    store_name: string;
    area: string;
    n: number | string;
    revenue: number | string;
  }>(
    `select o.store_id as store_id,
            max(o.store_name) as store_name,
            max(o.store_area) as area,
            count(*)::int as n,
            coalesce(sum(o.total), 0)::int as revenue
     from public.orders o ${orderFilter.clause}
     group by o.store_id
     order by revenue desc`,
    orderFilter.params
  );

  const areaRows = await query<{
    area: string;
    n: number | string;
    revenue: number | string;
  }>(
    `select o.store_area as area,
            count(*)::int as n,
            coalesce(sum(o.total), 0)::int as revenue
     from public.orders o ${orderFilter.clause}
     group by o.store_area
     order by revenue desc`,
    orderFilter.params
  );

  const itemFilter = itemJoinWhere(filters);
  const itemRows = await query<{
    fulfillment_status: string;
    n: number | string;
    subtotal: number | string;
  }>(
    `select oi.fulfillment_status as fulfillment_status,
            count(*)::int as n,
            coalesce(sum(oi.price * oi.quantity), 0)::int as subtotal
     from public.order_items oi
     join public.orders o on o.id = oi.order_id
     where 1 = 1 ${itemFilter.clause}
     group by oi.fulfillment_status`,
    itemFilter.params
  );
  let confirmedItemCount = 0;
  let unconfirmedItemCount = 0;
  let confirmedPurchaseTotal = 0;
  for (const row of itemRows) {
    if (CONFIRMED_ITEM_STATUSES.includes(row.fulfillment_status)) {
      confirmedItemCount += asInt(row.n);
      confirmedPurchaseTotal += asInt(row.subtotal);
    } else if (row.fulfillment_status === "pending") {
      unconfirmedItemCount += asInt(row.n);
    }
  }

  // Manual refunds are tracked separately from the store ledger.
  const refundRow = await queryOne<{ total: number | string }>(
    `select coalesce(sum(m.amount), 0)::int as total
     from public.manual_item_refunds m
     join public.orders o on o.id = m.order_id
     join public.order_items oi on oi.id = m.order_item_id
     where 1 = 1 ${itemFilter.clause}`,
    itemFilter.params
  );

  const walletTotal = asInt(walletRow?.total);
  const pickupFeeTotal = asInt(feeRow?.total);
  const refundTotal = asInt(refundRow?.total);
  const commission = Math.round(
    confirmedPurchaseTotal * ADMIN_STATS_COMMISSION_RATE
  );

  const dailySeries = await getDailySeries(filters);

  return {
    walletTotal,
    pendingOrders,
    confirmedOrders,
    pickupFeeTotal,
    confirmedPurchaseTotal,
    refundTotal,
    confirmedItemCount,
    unconfirmedItemCount,
    commission,
    ordersByStore: storeRows.map((row) => ({
      storeId: row.store_id,
      storeName: row.store_name,
      area: row.area,
      orderCount: asInt(row.n),
      revenue: asInt(row.revenue),
    })),
    ordersByArea: areaRows.map((row) => ({
      area: row.area,
      orderCount: asInt(row.n),
      revenue: asInt(row.revenue),
    })),
    dailySeries,
  };
}

// Daily buckets over the requested range for the SVG charts: last 30 days by
// default when no range is given, capped at 90 days.
function resolveSeriesBounds(filters: AdminStatsFilters): { start: string; end: string } {
  const toDate = (value?: string): Date | null => {
    if (!value) return null;
    const parsed = new Date(value.length <= 10 ? `${value}T23:59:59.999Z` : value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const fromDate = (value?: string): Date | null => {
    if (!value) return null;
    const parsed = new Date(value.length <= 10 ? `${value}T00:00:00.000Z` : value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const today = new Date();
  const end = toDate(filters.to) ?? today;
  let start = fromDate(filters.from) ?? new Date(end.getTime() - 29 * 86400000);
  if (start.getTime() > end.getTime()) start = new Date(end.getTime());
  const maxSpanMs = 89 * 86400000;
  if (end.getTime() - start.getTime() > maxSpanMs) {
    start = new Date(end.getTime() - maxSpanMs);
  }
  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

async function getDailySeries(filters: AdminStatsFilters): Promise<DailyStat[]> {
  const { start, end } = resolveSeriesBounds(filters);

  const orderConds: string[] = [];
  const orderParams: unknown[] = [start, end];
  if (filters.storeId) {
    orderParams.push(filters.storeId);
    orderConds.push(`o.store_id = $${orderParams.length}`);
  }
  if (filters.area) {
    orderParams.push(filters.area);
    orderConds.push(`o.store_area = $${orderParams.length}`);
  }
  const orderExtra = orderConds.length > 0 ? `and ${orderConds.join(" and ")}` : "";

  const orderRows = await query<{ day: Date | string; n: number | string; revenue: number | string; fees: number | string }>(
    `select d.day::date as day,
            count(o.id)::int as n,
            coalesce(sum(o.total), 0)::int as revenue,
            coalesce(sum(o.pickup_fee), 0)::int as fees
     from (select generate_series($1::date, $2::date, interval '1 day')::date as day) d
     left join public.orders o
       on o.created_at::date = d.day ${orderExtra}
     group by d.day
     order by d.day`,
    orderParams
  );

  const refundConds: string[] = [];
  const refundParams: unknown[] = [start, end];
  if (filters.storeId) {
    refundParams.push(filters.storeId);
    refundConds.push(`oi.store_id = $${refundParams.length}`);
  }
  if (filters.area) {
    refundParams.push(filters.area);
    refundConds.push(`o.store_area = $${refundParams.length}`);
  }
  const refundExtra = refundConds.length > 0 ? `and ${refundConds.join(" and ")}` : "";

  const refundRows = await query<{ day: Date | string; total: number | string }>(
    `select d.day::date as day,
            coalesce(sum(m.amount), 0)::int as total
     from (select generate_series($1::date, $2::date, interval '1 day')::date as day) d
     left join public.manual_item_refunds m
       on m.pickup_finalized_at::date = d.day
     left join public.order_items oi on oi.id = m.order_item_id
     left join public.orders o on o.id = m.order_id ${refundExtra}
     group by d.day
     order by d.day`,
    refundParams
  );
  const refundByDay = new Map(
    refundRows.map((row) => [dateOnly(row.day), asInt(row.total)])
  );

  return orderRows.map((row) => {
    const date = dateOnly(row.day);
    return {
      date,
      orders: asInt(row.n),
      revenue: asInt(row.revenue),
      pickupFees: asInt(row.fees),
      refunds: refundByDay.get(date) ?? 0,
    };
  });
}
