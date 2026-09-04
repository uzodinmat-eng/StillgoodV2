import { Order, OrderItemRecord } from "@/lib/types";
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

async function itemsForOrder(orderId: string): Promise<OrderItemRecord[]> {
  const rows = await query<OrderItemRow>(
    `select product_id, product_name, brand, unit, price, original_price, quantity,
            image_url, store_id, store_name, expiry_date
     from public.order_items
     where order_id = $1
     order by sort_index asc`,
    [orderId]
  );
  return rows.map(mapItem);
}

export async function insertOrder(order: Order): Promise<Order> {
  await execute(
    `insert into public.orders (
        id, customer_id, customer_name, customer_email, customer_phone,
        store_id, store_name, store_address, store_area,
        subtotal, platform_fee, savings_total, total,
        status, payment_method, payment_reference,
        pickup_date, pickup_time_slot, pickup_verification_code,
        requires_consolidation, origin_stores, hub_batch, picked_up_at,
        created_at, updated_at
      ) values (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19,
        $20, $21::jsonb, $22, $23,
        $24, $25
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

  return order;
}

export async function findOrderById(orderId: string): Promise<Order | null> {
  const row = await queryOne<OrderRow>(
    `select * from public.orders where id = $1`,
    [orderId]
  );
  if (!row) return null;
  return mapOrder(row, await itemsForOrder(row.id));
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
    orders.push(mapOrder(row, await itemsForOrder(row.id)));
  }
  return orders;
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
