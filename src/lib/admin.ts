"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { customerIsAdmin } from "./auth-utils";
import { execute, queryOne } from "./db/client";
import { getAdminStats, AdminStats, AdminStatsFilters } from "./db/admin-stats";
import { listManualRefunds, ManualItemRefund, markManualRefund } from "./db/manual-refunds";
import { findOrderPayment } from "./db/payments";
import { refundPaystackTransaction } from "./paystack";
import { getUnreadCounts, listStoreThread, markThreadRead, sendStoreMessage, StoreMessage, UnreadCounts } from "./db/messages";
import { listAllOrders } from "./db/orders";
import { insertStore, listStores, STORE_AREAS, updateStoreStatus } from "./db/stores";
import { Customer, Order, Store, StoreStatus } from "./types";

const TERMINAL_ORDER_STATUSES = "('picked_up', 'cancelled', 'refunded')";

// Raised cap so desk-level stats tables are not truncated at the old 100-row
// default. Stats themselves come from aggregate SQL (not this list); the list is
// only the visible order table, capped to keep the desk query cheap.
// (Not exported: "use server" modules may only export async functions.)
const ADMIN_DESK_ORDER_LIMIT = 500;

export type AdminStoreInput = {
  name: string;
  area: Store["area"];
  address: string;
  phone: string;
  openHours?: string;
  pickupInstructions?: string;
};

export type AdminDeskFilters = AdminStatsFilters;

async function requireAdmin(): Promise<Customer> {
  const customer = await getSession();
  if (!customer) {
    throw new Error("Log in with an admin email to use this desk.");
  }
  if (!customerIsAdmin(customer)) {
    throw new Error("This account is not on the admin allow-list.");
  }
  return customer;
}

export async function getAdminDesk(filters: AdminDeskFilters = {}): Promise<{
  customer: Customer | null;
  isAdmin: boolean;
  stores: Store[];
  pendingStores: Store[];
  orders: Order[];
  areas: Store["area"][];
  stats: AdminStats | null;
  filters: AdminDeskFilters;
  pendingRefunds: ManualItemRefund[];
  decidedRefunds: ManualItemRefund[];
}> {
  const customer = await getSession();
  const isAdmin = customerIsAdmin(customer);
  if (!isAdmin) {
    return {
      customer,
      isAdmin: false,
      stores: [],
      pendingStores: [],
      orders: [],
      areas: STORE_AREAS,
      stats: null,
      filters,
      pendingRefunds: [],
      decidedRefunds: [],
    };
  }
  const [allStores, orders, stats, pendingRefunds, decidedRefunds] = await Promise.all([
    listStores({ all: true }),
    listAllOrders(ADMIN_DESK_ORDER_LIMIT),
    getAdminStats(filters).catch(() => null),
    listManualRefunds("pending").catch((): ManualItemRefund[] => []),
    Promise.all([
      listManualRefunds("sent").catch((): ManualItemRefund[] => []),
      listManualRefunds("rejected").catch((): ManualItemRefund[] => []),
    ]).then(([sent, rejected]) =>
      [...sent, ...rejected].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200)
    ),
  ]);
  const approvedStores = allStores.filter((s) => s.status !== "pending");
  const pendingStores = allStores.filter((s) => s.status === "pending");

  return {
    customer,
    isAdmin: true,
    stores: approvedStores,
    pendingStores,
    orders,
    areas: STORE_AREAS,
    stats,
    filters,
    pendingRefunds,
    decidedRefunds,
  };
}

export async function getStoreThreadAction(
  storeId: string
): Promise<{ success: boolean; messages?: StoreMessage[]; error?: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }

  const id = storeId.trim();
  if (!id) return { success: false, error: "Missing store id." };

  try {
    const messages = await listStoreThread(id);
    return { success: true, messages };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not load the thread.",
    };
  }
}

export async function sendAdminMessageAction(
  storeId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  let customer: Customer;
  try {
    customer = await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }

  try {
    await sendStoreMessage({
      storeId,
      senderRole: "admin",
      senderCustomerId: customer.id,
      body,
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not send the message.",
    };
  }
}

export async function getUnreadCountsAction(): Promise<{
  success: boolean;
  counts?: UnreadCounts;
  error?: string;
}> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }

  try {
    const counts = await getUnreadCounts();
    return { success: true, counts };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not load unread counts.",
    };
  }
}

export async function markThreadReadAction(
  storeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }

  const id = storeId.trim();
  if (!id) return { success: false, error: "Missing store id." };

  try {
    await markThreadRead(id, "admin");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not mark the thread as read.",
    };
  }
}

export async function deleteProductAsAdmin(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }

  const id = productId.trim();
  if (!id) return { success: false, error: "Missing product id." };

  try {
    const live = await queryOne<{ order_id: string | null }>(
      `select oi.order_id as order_id
       from public.order_items oi
       join public.orders o on o.id = oi.order_id
       where oi.product_id = $1
         and o.status not in ${TERMINAL_ORDER_STATUSES}
       limit 1`,
      [id]
    );
    if (live?.order_id) {
      return {
        success: false,
        error: "This product is in an open order and cannot be removed yet.",
      };
    }
    await execute(`delete from public.products where id = $1`, [id]);
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not remove the product.",
    };
  }
}

export async function setStoreActiveAction(
  storeId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }

  try {
    await execute(
      `update public.stores set is_active = $2, updated_at = now() where id = $1`,
      [storeId, isActive]
    );
    revalidatePath("/");
    revalidatePath("/stores");
    revalidatePath("/admin");
    revalidatePath("/store");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update store status.",
    };
  }
}

export async function deleteStoreAsAdmin(
  storeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }

  const id = storeId.trim();
  if (!id) return { success: false, error: "Missing store id." };

  try {
    const refs = await queryOne<{ orders: number | string; fulfillments: number | string; withdrawals: number | string }>(
      `select
         (select count(*)::int from public.orders where store_id = $1
            or id in (select order_id from public.order_items where store_id = $1)) as orders,
         (select count(*)::int from public.store_fulfillments where store_id = $1) as fulfillments,
         (select count(*)::int from public.store_withdrawals where store_id = $1) as withdrawals`,
      [id]
    );
    const hasHistory =
      Number(refs?.orders ?? 0) > 0 ||
      Number(refs?.fulfillments ?? 0) > 0 ||
      Number(refs?.withdrawals ?? 0) > 0;
    if (hasHistory) {
      return {
        success: false,
        error: "This store has order history, suspend it instead of deleting.",
      };
    }
    // Delete products first (products.store_id has no cascade), unlink any
    // owner customers, and demote owners left with no store back to customer
    // so the account page stops showing a dead Store portal button. Single
    // statement so it applies atomically. Reviews, review scores, and
    // store_messages all cascade from stores.
    await execute(
      `with del_products as (
         delete from public.products where store_id = $1
       ),
       del_links as (
         update public.customers set store_id = null where store_id = $1
       ),
       demote_owners as (
         update public.customers set role = 'customer', updated_at = now()
         where store_id is null and role = 'store_owner'
           and not exists (select 1 from public.stores s where s.owner_id = public.customers.id)
       )
       delete from public.stores where id = $1`,
      [id]
    );
    revalidatePath("/");
    revalidatePath("/stores");
    revalidatePath("/admin");
    revalidatePath("/store");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not delete the store.",
    };
  }
}

export async function listStoreProductsAction(
  storeId: string
): Promise<{ success: boolean; products?: { id: string; name: string; brand: string; stockQuantity: number; currentPrice: number }[]; error?: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }
  const id = storeId.trim();
  if (!id) return { success: false, error: "Missing store id." };
  try {
    const { findProductsForStore } = await import("./db/products");
    const products = await findProductsForStore(id);
    return {
      success: true,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        stockQuantity: p.stockQuantity,
        currentPrice: p.currentPrice,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not load products.",
    };
  }
}

export async function setStoreStatusAction(
  storeId: string,
  status: StoreStatus,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  let admin: Customer;
  try {
    admin = await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }

  try {
    await updateStoreStatus(storeId, status);
    // Deliver the decision reason as an in-app message on the store's thread.
    const trimmed = (reason || "").trim();
    if (trimmed) {
      try {
        const { sendStoreMessage } = await import("./db/messages");
        const label = status === "approved" ? "Approved" : status === "suspended" ? "Rejected" : status;
        await sendStoreMessage({
          storeId,
          senderRole: "admin",
          senderCustomerId: admin.id,
          body: `[${label}] ${trimmed}`,
        });
      } catch {
        // Status change already applied; message delivery is best effort.
      }
    }
    revalidatePath("/");
    revalidatePath("/stores");
    revalidatePath("/admin");
    revalidatePath("/store");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update store status.",
    };
  }
}

export async function createStoreAction(
  input: AdminStoreInput
): Promise<{ success: boolean; store?: Store; error?: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }

  const name = input.name.trim();
  const address = input.address.trim();
  const phone = input.phone.trim();
  if (!name) return { success: false, error: "Enter the store name." };
  if (!address) return { success: false, error: "Enter the store address." };
  if (!phone) return { success: false, error: "Enter a contact phone." };
  if (!STORE_AREAS.includes(input.area)) {
    return { success: false, error: "Pick an Abuja area." };
  }

  try {
    const store = await insertStore({
      name,
      area: input.area,
      address,
      phone,
      openHours: input.openHours,
      pickupInstructions: input.pickupInstructions,
    });
    revalidatePath("/");
    revalidatePath("/stores");
    revalidatePath("/admin");
    revalidatePath(`/stores/${store.slug}`);
    return { success: true, store };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unique|duplicate|stores_pkey|stores_slug/i.test(message)) {
      return { success: false, error: "A store with that name already exists." };
    }
    return { success: false, error: "Could not save the store." };
  }
}

// Item refunds are sent through Paystack back to the account that paid.
export async function markItemRefundSentAction(
  refundId: string
): Promise<{ success: boolean; error?: string }> {
  let admin: Customer;
  try {
    admin = await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }

  const id = refundId.trim();
  if (!id) return { success: false, error: "Missing refund id." };

  const refund = await queryOne<{
    order_id: string;
    amount: number | string;
    status: string;
    product_name: string;
  }>(
    `select order_id, amount, status, product_name from public.manual_item_refunds where id = $1`,
    [id]
  );
  if (!refund || refund.status !== "pending") {
    return { success: false, error: "That refund is no longer pending." };
  }

  const payment = await findOrderPayment(refund.order_id);
  if (!payment?.gatewayReference || payment.status !== "success") {
    return { success: false, error: "This order has no successful Paystack transfer to refund." };
  }

  try {
    const result = await refundPaystackTransaction({
      reference: payment.gatewayReference,
      amountNaira: Number(refund.amount),
      customerNote: `Refund for ${refund.product_name}`,
      merchantNote: `Unavailable item refund ${id}`,
    });
    if (result.status === "failed") {
      return { success: false, error: "Paystack could not send this refund to the paying account." };
    }
    await markManualRefund(id, "sent", admin.id);
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not refund this transfer.",
    };
  }
}

export async function rejectItemRefundAction(
  refundId: string
): Promise<{ success: boolean; error?: string }> {
  let admin: Customer;
  try {
    admin = await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Not allowed.",
    };
  }

  const id = refundId.trim();
  if (!id) return { success: false, error: "Missing refund id." };

  try {
    await markManualRefund(id, "rejected", admin.id);
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not update the refund.",
    };
  }
}
