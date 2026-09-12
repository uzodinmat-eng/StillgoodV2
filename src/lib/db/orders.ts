import { Order, OrderItemRecord, StoreFulfillment } from "@/lib/types";
import { asInt, dateOnly, execute, isoTimestamp, query, queryOne } from "./client";

interface OrderRow {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  store_id: string;
  store_name: string;
  store_address: string;
  store_area: string;
  subtotal: number | string;
  platform_fee: number | string;
  pickup_fee: number | string;
  savings_total: number | string;
  total: number | string;
  status: Order["status"];
  payment_method: Order["paymentMethod"];
  payment_reference: string;
  pickup_date: Date | string;
  pickup_time_slot: string;
  pickup_verification_code: string;
  requires_consolidation: boolean;
  origin_stores: unknown;
  hub_batch: "noon" | "evening" | null;
  picked_up_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface StoreFulfillmentRow {
  store_id: string;
  subtotal: number | string;
  status: StoreFulfillment["status"];
  pickup_code: string;
  picked_up_at: Date | string | null;
  confirmed_at: Date | string | null;
  payout_released_at: Date | string | null;
  created_at: Date | string | null;
}

interface OrderItemRow {
  product_id: string;
  product_name: string;
  brand: string;
  unit: string;
  price: number | string;
  original_price: number | string;
  quantity: number | string;
  image_url: string;
  store_id: string;
  store_name: string;
  expiry_date: Date | string;
  fulfillment_status: "pending" | "available" | "unavailable" | "picked_up";
  refunded_at: Date | string | null;
  decided_at: Date | string | null;
}

function parseOriginStores(value: unknown): Order["originStores"] {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) return value as Order["originStores"];
  return [];
}

function mapItem(row: OrderItemRow): OrderItemRecord {
  return {
    productId: row.product_id,
    productName: row.product_name,
    brand: row.brand,
    unit: row.unit,
    price: asInt(row.price),
    originalPrice: asInt(row.original_price),
    quantity: asInt(row.quantity),
    image: row.image_url || "",
    storeId: row.store_id,
    storeName: row.store_name,
    expiryDate: dateOnly(row.expiry_date),
    fulfillmentStatus: row.fulfillment_status,
    refundedAt: row.refunded_at ? isoTimestamp(row.refunded_at) : undefined,
    decidedAt: row.decided_at ? isoTimestamp(row.decided_at) : undefined,
  };
}

function mapOrder(row: OrderRow, items: OrderItemRecord[]): Order {
  return {
    id: row.id,
    customerId: row.customer_id || undefined,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    items,
    storeId: row.store_id,
    storeName: row.store_name,
    storeAddress: row.store_address,
    storeArea: row.store_area,
    subtotal: asInt(row.subtotal),
    platformFee: asInt(row.platform_fee),
    pickupFee: asInt(row.pickup_fee),
    savingsTotal: asInt(row.savings_total),
    total: asInt(row.total),
    status: row.status,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    pickupDate: dateOnly(row.pickup_date),
    pickupTimeSlot: row.pickup_time_slot,
    pickupVerificationCode: row.pickup_verification_code,
    requiresConsolidation: Boolean(row.requires_consolidation),
    originStores: parseOriginStores(row.origin_stores),
    hubBatch: row.hub_batch,
    pickedUpAt: row.picked_up_at ? isoTimestamp(row.picked_up_at) : undefined,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
  };
}

function mapFulfillment(row: StoreFulfillmentRow): StoreFulfillment {
  return {
    storeId: row.store_id,
    subtotal: asInt(row.subtotal),
    status: row.status,
    pickupCode: row.pickup_code,
    pickedUpAt: row.picked_up_at ? isoTimestamp(row.picked_up_at) : undefined,
    confirmedAt: row.confirmed_at ? isoTimestamp(row.confirmed_at) : undefined,
    payoutReleasedAt: row.payout_released_at
      ? isoTimestamp(row.payout_released_at)
      : undefined,
    createdAt: row.created_at ? isoTimestamp(row.created_at) : undefined,
  };
}

async function fulfillmentsForOrder(orderId: string): Promise<StoreFulfillment[]> {
  try {
    const rows = await query<StoreFulfillmentRow>(
      `select store_id, subtotal, status, pickup_code, picked_up_at,
              confirmed_at, payout_released_at, created_at
       from public.store_fulfillments where order_id = $1 order by store_id`,
      [orderId]
    );
    return rows.map(mapFulfillment);
  } catch (error) {
    // Tolerate databases where the admin-desk migration has not applied yet
    // (the app-startup runner applies migrations lazily).
    if (!(error instanceof Error) || !/confirmed_at|payout_released_at|column/i.test(error.message)) {
      throw error;
    }
    const rows = await query<StoreFulfillmentRow>(
      `select store_id, subtotal, status, pickup_code, picked_up_at
       from public.store_fulfillments where order_id = $1 order by store_id`,
      [orderId]
    );
    return rows.map(mapFulfillment);
  }
}

async function itemsForOrder(orderId: string): Promise<OrderItemRecord[]> {
  try {
    const rows = await query<OrderItemRow>(
      `select product_id, product_name, brand, unit, price, original_price, quantity,
              image_url, store_id, store_name, expiry_date, fulfillment_status, refunded_at,
              decided_at
       from public.order_items
       where order_id = $1
       order by sort_index asc`,
      [orderId]
    );
    return rows.map(mapItem);
  } catch (error) {
    // Tolerate databases where the decided_at migration has not applied yet.
    if (!(error instanceof Error) || !/decided_at|column/i.test(error.message)) {
      throw error;
    }
    const rows = await query<OrderItemRow>(
      `select product_id, product_name, brand, unit, price, original_price, quantity,
              image_url, store_id, store_name, expiry_date, fulfillment_status, refunded_at
       from public.order_items
       where order_id = $1
       order by sort_index asc`,
      [orderId]
    );
    return rows.map(mapItem);
  }
}

export async function insertOrder(order: Order): Promise<Order> {
  await execute(
    `insert into public.orders (
        id, customer_id, customer_name, customer_email, customer_phone,
        store_id, store_name, store_address, store_area,
        subtotal, platform_fee, pickup_fee, savings_total, total,
        status, payment_method, payment_reference,
        pickup_date, pickup_time_slot, pickup_verification_code,
        requires_consolidation, origin_stores, hub_batch, picked_up_at,
        created_at, updated_at
      ) values (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20,
        $21, $22::jsonb, $23, $24,
        $25, $26
      )`,
    [
      order.id,
      order.customerId ?? null,
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      order.storeId,
      order.storeName,
      order.storeAddress,
      order.storeArea,
      order.subtotal,
      order.platformFee,
      order.pickupFee,
      order.savingsTotal,
      order.total,
      order.status,
      order.paymentMethod,
      order.paymentReference,
      order.pickupDate,
      order.pickupTimeSlot,
      order.pickupVerificationCode,
      Boolean(order.requiresConsolidation),
      JSON.stringify(order.originStores ?? []),
      order.hubBatch ?? null,
      order.pickedUpAt ?? null,
      order.createdAt,
      order.updatedAt,
    ]
  );

  for (let i = 0; i < order.items.length; i += 1) {
    const item = order.items[i];
    await execute(
      `insert into public.order_items (
          id, order_id, product_id, product_name, brand, unit,
          price, original_price, quantity, image_url,
          store_id, store_name, expiry_date, sort_index
        ) values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14
        )`,
      [
        `${order.id}-${i + 1}`,
        order.id,
        item.productId,
        item.productName,
        item.brand,
        item.unit,
        item.price,
        item.originalPrice,
        item.quantity,
        item.image,
        item.storeId,
        item.storeName,
        item.expiryDate,
        i,
      ]
    );
  }

  await execute(
    `insert into public.store_fulfillments (id, order_id, store_id, subtotal, status, pickup_code)
     select $1 || '-' || oi.store_id, oi.order_id, oi.store_id, sum(oi.price * oi.quantity),
            'pending', $2
     from public.order_items oi
     where oi.order_id = $1
     group by oi.order_id, oi.store_id
     on conflict (order_id, store_id) do nothing`,
    [order.id, order.pickupVerificationCode]
  );

  return order;
}

export async function decideStoreOrderItem(input: { orderId: string; storeId: string; productId: string; available: boolean }): Promise<Order | null> {
  await execute(`select public.decide_store_order_item($1, $2, $3, $4)`, [input.orderId, input.storeId, input.productId, input.available]);
  return findOrderById(input.orderId);
}

export async function findOrderById(orderId: string): Promise<Order | null> {
  const row = await queryOne<OrderRow>(
    `select * from public.orders where id = $1`,
    [orderId]
  );
  if (!row) return null;
  const order = mapOrder(row, await itemsForOrder(row.id));
  order.fulfillments = await fulfillmentsForOrder(row.id);
  return order;
}

export async function findOrdersForCustomer(options: {
  customerId: string;
  email?: string;
  phone?: string;
}): Promise<Order[]> {
  const rows = await query<OrderRow>(
    `select * from public.orders
     where customer_id = $1
        or ($2 <> '' and lower(customer_email) = lower($2))
        or (
          $3 <> ''
          and regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g')
            = regexp_replace($3, '[^0-9]', '', 'g')
        )
     order by created_at desc
     limit 50`,
    [options.customerId, options.email?.trim() || "", options.phone?.trim() || ""]
  );
  const orders: Order[] = [];
  for (const row of rows) {
    const order = mapOrder(row, await itemsForOrder(row.id));
    order.fulfillments = await fulfillmentsForOrder(row.id);
    orders.push(order);
  }
  return orders;
}

export async function findOrdersForStore(storeId: string, limit = 100): Promise<Order[]> {
  const rows = await query<OrderRow>(
    `select distinct o.* from public.orders o
     left join public.order_items oi on oi.order_id = o.id
     where o.store_id = $1 or oi.store_id = $1
     order by o.created_at desc
     limit $2`,
    [storeId, limit]
  );
  const orders: Order[] = [];
  for (const row of rows) {
    const order = mapOrder(row, await itemsForOrder(row.id));
    order.fulfillments = await fulfillmentsForOrder(row.id);
    orders.push(order);
  }
  return orders;
}

export async function listAllOrders(limit = 100, offset = 0): Promise<Order[]> {
  const rows = await query<OrderRow>(
    `select * from public.orders
     order by created_at desc
     limit $1 offset $2`,
    [limit, offset]
  );
  const orders: Order[] = [];
  for (const row of rows) {
    const order = mapOrder(row, await itemsForOrder(row.id));
    order.fulfillments = await fulfillmentsForOrder(row.id);
    orders.push(order);
  }
  return orders;
}

export async function completeStorePickup(orderId: string, storeId: string, pickupCode: string): Promise<Order | null> {
  const result = await queryOne<{ order_id: string }>(
    `select order_id from public.complete_store_pickup($1, $2, $3)`,
    [orderId, storeId, pickupCode]
  );
  return result ? findOrderById(result.order_id) : null;
}
export async function updateOrderStatus(
  orderId: string,
  status: Order["status"],
  pickedUpAt?: string
): Promise<Order | null> {
  await execute(
    `update public.orders
     set status = $2, picked_up_at = $3, updated_at = now()
     where id = $1`,
    [orderId, status, pickedUpAt ?? null]
  );
  return findOrderById(orderId);
}
