"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { customerIsAdmin } from "./auth-utils";
import { loadCatalog } from "./db/catalog";
import { completeStorePickup, decideStoreOrderItem, findOrdersForStore } from "./db/orders";
import { findProductById, findProductsForStore, insertProduct, updateProduct } from "./db/products";
import { findStoreById, findStoreByOwnerId, listStores } from "./db/stores";
import { createServerSupabase } from "./supabase/server";
import { Category, Customer, DateType, Order, Product, Store } from "./types";

export type ProductListingInput = {
  storeId: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  unit: string;
  images: string[];
  originalPrice: number;
  baseDiscountPercent: number;
  dateType: DateType;
  expiryDate: string;
  stockQuantity: number;
  storageCondition: Product["storageCondition"];
  nafdacRegNo?: string;
  conditionNotes?: string;
};

async function getAuthorizedStore(targetStoreId?: string): Promise<{ customer: Customer; store: Store }> {
  const customer = await getSession();
  if (!customer) {
    throw new Error("Please log in to access the store portal.");
  }

  let store: Store | null = null;
  const isAdmin = customerIsAdmin(customer);

  if (targetStoreId) {
    store = await findStoreById(targetStoreId);
  } else if (customer.storeId) {
    store = await findStoreById(customer.storeId);
  } else {
    store = await findStoreByOwnerId(customer.id);
  }

  // If still not found and user is admin, default to first store
  if (!store && isAdmin) {
    const stores = await listStores({ all: true });
    store = stores[0] || null;
  }

  if (!store) {
    throw new Error("No supermarket found linked to your account.");
  }

  // Permission check: only admin or assigned owner
  if (!isAdmin && store.ownerId && store.ownerId !== customer.id && customer.storeId !== store.id) {
    throw new Error("You do not have permission to manage this supermarket.");
  }

  return { customer, store };
}

export async function getStorePortalData(targetStoreId?: string): Promise<{
  customer: Customer | null;
  store: Store | null;
  products: Product[];
  orders: Order[];
  categories: Category[];
  allStores: Store[];
  error?: string;
}> {
  const customer = await getSession();
  if (!customer) {
    return {
      customer: null,
      store: null,
      products: [],
      orders: [],
      categories: [],
      allStores: [],
    };
  }

  try {
    const { store } = await getAuthorizedStore(targetStoreId);
    const [products, orders, catalog, allStores] = await Promise.all([
      findProductsForStore(store.id),
      findOrdersForStore(store.id, 100),
      loadCatalog(),
      customerIsAdmin(customer) ? listStores({ all: true }) : Promise.resolve([store]),
    ]);

    return {
      customer,
      store,
      products,
      orders,
      categories: catalog.categories,
      allStores,
    };
  } catch (error) {
    const catalog = await loadCatalog();
    return {
      customer,
      store: null,
      products: [],
      orders: [],
      categories: catalog.categories,
      allStores: [],
      error: error instanceof Error ? error.message : "Access error",
    };
  }
}

export async function createProductAction(
  input: ProductListingInput
): Promise<{ success: boolean; product?: Product; error?: string }> {
  try {
    const { store } = await getAuthorizedStore(input.storeId);

    if (store.status !== "approved") {
      return { success: false, error: "Cannot list items: supermarket is pending approval." };
    }

    if (!input.name.trim()) return { success: false, error: "Enter item name." };
    if (!input.category) return { success: false, error: "Select a category." };
    if (input.originalPrice <= 0) return { success: false, error: "Original price must be greater than 0." };
    if (input.baseDiscountPercent < 0 || input.baseDiscountPercent > 95) {
      return { success: false, error: "Discount must be between 0% and 95%." };
    }
    if (!input.expiryDate) return { success: false, error: "Select expiry / best-before date." };
    if (input.stockQuantity < 0) return { success: false, error: "Stock quantity cannot be negative." };

    const product = await insertProduct({
      storeId: store.id,
      name: input.name,
      brand: input.brand,
      category: input.category,
      description: input.description,
      unit: input.unit,
      images: input.images,
      originalPrice: input.originalPrice,
      baseDiscountPercent: input.baseDiscountPercent,
      dateType: input.dateType,
      expiryDate: input.expiryDate,
      stockQuantity: input.stockQuantity,
      storageCondition: input.storageCondition,
      nafdacRegNo: input.nafdacRegNo,
      conditionNotes: input.conditionNotes,
    });

    revalidatePath("/");
    revalidatePath("/stores");
    revalidatePath(`/stores/${store.slug}`);
    revalidatePath(`/product/${product.slug}`);
    revalidatePath("/store");

    return { success: true, product };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create product listing.",
    };
  }
}

export async function updateProductAction(
  productId: string,
  input: Partial<ProductListingInput>
): Promise<{ success: boolean; product?: Product; error?: string }> {
  try {
    const existing = await findProductById(productId);
    if (!existing) return { success: false, error: "Product not found." };

    await getAuthorizedStore(existing.storeId);

    const updated = await updateProduct(productId, {
      name: input.name,
      brand: input.brand,
      category: input.category,
      description: input.description,
      unit: input.unit,
      images: input.images,
      originalPrice: input.originalPrice,
      baseDiscountPercent: input.baseDiscountPercent,
      dateType: input.dateType,
      expiryDate: input.expiryDate,
      stockQuantity: input.stockQuantity,
      storageCondition: input.storageCondition,
      nafdacRegNo: input.nafdacRegNo,
      conditionNotes: input.conditionNotes,
    });

    if (!updated) return { success: false, error: "Failed to update item." };

    revalidatePath("/");
    revalidatePath("/stores");
    revalidatePath(`/product/${updated.slug}`);
    revalidatePath("/store");

    return { success: true, product: updated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update product.",
    };
  }
}


export async function decideStoreOrderItemAction(input: { orderId: string; storeId: string; productId: string; available: boolean }): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const { store } = await getAuthorizedStore(input.storeId);
    const order = await decideStoreOrderItem({ ...input, storeId: store.id });
    if (!order) return { success: false, error: "Order item could not be updated." };
    revalidatePath("/store"); revalidatePath(`/order/${order.id}`);
    return { success: true, order };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not update item." };
  }
}

export async function completeStorePickupAction(input: {
  orderId: string;
  storeId: string;
  pickupCode: string;
}): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const { store } = await getAuthorizedStore(input.storeId);
    if (store.status !== "approved") {
      return { success: false, error: "This supermarket is not approved for pickup handoff." };
    }
    const code = input.pickupCode.trim();
    if (!/^\d{4}$/.test(code)) {
      return { success: false, error: "Enter the customer's 4-digit pickup code." };
    }
    const order = await completeStorePickup(input.orderId, store.id, code);
    if (!order) return { success: false, error: "Pickup could not be completed." };
    revalidatePath("/store");
    revalidatePath("/");
    revalidatePath(`/order/${order.id}`);
    return { success: true, order };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pickup verification failed.";
    return { success: false, error: message.replace(/^.*ERROR:\s*/i, "") };
  }
}
export async function changeStorePasswordAction(newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update password.",
    };
  }
}
