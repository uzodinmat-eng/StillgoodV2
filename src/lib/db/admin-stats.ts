import { asInt, query, queryOne } from "./client";

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

  // Positive customer-credit leg only (the matching platform leg is negative).
  const refundRow = await queryOne<{ total: number | string }>(
    `select coalesce(sum(le.amount), 0)::int as total
     from public.ledger_entries le
     join public.order_items oi on oi.id = le.ref_id
     join public.orders o on o.id = oi.order_id
     where le.kind = 'item_refund' and le.ref_type = 'order_item' and le.amount > 0
     ${itemFilter.clause}`,
    itemFilter.params
  );

  const walletTotal = asInt(walletRow?.total);
  const pickupFeeTotal = asInt(feeRow?.total);
  const refundTotal = asInt(refundRow?.total);
  const commission = Math.round(
    confirmedPurchaseTotal * ADMIN_STATS_COMMISSION_RATE
  );

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
  };
}
