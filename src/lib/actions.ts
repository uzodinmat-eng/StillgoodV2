"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getProductById, getProducts, getStoreById } from "./data";
import { calculateOrderSummary } from "./fees";
import { CartItem, CartSummary, Order, OrderItemRecord, PopulatedCartItem } from "./types";
import {
  getHubBatchForSlot,
  isValidPickupSlot,
  needsConsolidation,
  toOriginStoreRefs,
} from "./fulfillment";
import { debitWallet, getSession, updateCustomerProfile } from "./auth";

const CART_COOKIE_NAME = "stillgood_cart";
const ORDERS_COOKIE_NAME = "stillgood_orders";

// Helper to safely parse cart from cookie
async function getRawCartItems(): Promise<CartItem[]> {
  const cookieStore = await cookies();
  const cartCookie = cookieStore.get(CART_COOKIE_NAME);
  if (!cartCookie || !cartCookie.value) return [];
  try {
    const parsed = JSON.parse(cartCookie.value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

// Helper to save raw cart items to cookie
async function saveRawCartItems(items: CartItem[]): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE_NAME, JSON.stringify(items), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Retrieves the fully hydrated cart summary using the server-side cookie
 */
export async function getCart(): Promise<CartSummary> {
  const rawItems = await getRawCartItems();
  const products = getProducts();
  
  const populatedItems: PopulatedCartItem[] = [];

  for (const raw of rawItems) {
    const product = products.find((p) => p.id === raw.productId);
    if (product) {
      const store = getStoreById(product.storeId);
      if (store) {
        const itemTotal = product.currentPrice * raw.quantity;
        const originalItemTotal = product.originalPrice * raw.quantity;
        const savingsTotal = Math.max(0, originalItemTotal - itemTotal);

        populatedItems.push({
          product,
          store,
          quantity: raw.quantity,
          itemTotal,
          originalItemTotal,
          savingsTotal,
        });
      }
    }
  }

  return calculateOrderSummary(populatedItems);
}

/**
 * Server Action: Add product to cart via Form Action or Direct Call
 */
export async function addToCart(
  formDataOrData: FormData | { productId: string; quantity?: number }
): Promise<{ success: boolean; message: string; cartSummary?: CartSummary }> {
  let productId = "";
  let quantity = 1;

  if (formDataOrData instanceof FormData) {
    productId = (formDataOrData.get("productId") as string) || "";
    const qtyStr = formDataOrData.get("quantity") as string;
    if (qtyStr) quantity = parseInt(qtyStr, 10) || 1;
  } else {
    productId = formDataOrData.productId;
    quantity = formDataOrData.quantity || 1;
  }

  if (!productId) {
    return { success: false, message: "Invalid product identifier" };
  }

  const product = getProductById(productId);
  if (!product) {
    return { success: false, message: "Product not found" };
  }

  if (product.stockQuantity < 1) {
    return { success: false, message: "Item is currently sold out" };
  }

  const rawItems = await getRawCartItems();
  const existingIndex = rawItems.findIndex((item) => item.productId === productId);

  if (existingIndex > -1) {
    const newQty = rawItems[existingIndex].quantity + quantity;
    if (newQty > product.stockQuantity) {
      rawItems[existingIndex].quantity = product.stockQuantity;
    } else {
      rawItems[existingIndex].quantity = newQty;
    }
  } else {
    rawItems.push({
      productId,
      quantity: Math.min(quantity, product.stockQuantity),
      addedAt: Date.now(),
    });
  }

  await saveRawCartItems(rawItems);
  revalidatePath("/");
  revalidatePath("/cart");

  const updatedCart = await getCart();
  return {
    success: true,
    message: `Added ${product.name} to cart`,
    cartSummary: updatedCart,
  };
}

/**
 * Server Action: Update item quantity
 */
export async function updateCartQuantity(
  productId: string,
  quantity: number
): Promise<{ success: boolean; cartSummary: CartSummary }> {
  let rawItems = await getRawCartItems();

  if (quantity <= 0) {
    rawItems = rawItems.filter((item) => item.productId !== productId);
  } else {
    const product = getProductById(productId);
    const maxStock = product ? product.stockQuantity : 99;
    const finalQty = Math.min(quantity, maxStock);

    const index = rawItems.findIndex((item) => item.productId === productId);
    if (index > -1) {
      rawItems[index].quantity = finalQty;
    }
  }

  await saveRawCartItems(rawItems);
  revalidatePath("/");
  revalidatePath("/cart");

  const summary = await getCart();
  return { success: true, cartSummary: summary };
}

/**
 * Server Action: Remove item from cart
 */
export async function removeFromCart(
  productId: string
): Promise<{ success: boolean; cartSummary: CartSummary }> {
  let rawItems = await getRawCartItems();
  rawItems = rawItems.filter((item) => item.productId !== productId);

  await saveRawCartItems(rawItems);
  revalidatePath("/");
  revalidatePath("/cart");

  const summary = await getCart();
  return { success: true, cartSummary: summary };
}

/**
 * Server Action: Clear the cart
 */
export async function clearCart(): Promise<{ success: boolean }> {
  await saveRawCartItems([]);
  revalidatePath("/");
  revalidatePath("/cart");
  return { success: true };
}

/**
 * Generate a randomized Nigerian order number in format SG-XXXXX
 * e.g., SG-48291, SG-81043, SG-59328
 */
function generateOrderNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `SG-${randomNum}`;
}

/**
 * Generate 4-digit pickup verification PIN
 */
function generatePickupPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// In-memory order cache fallback
const IN_MEMORY_ORDERS = new Map<string, Order>();

/**
 * Server Action: Create Order from Cart and checkout form
 */
export async function createOrder(data: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  storeId: string;
  pickupDate: string;
  pickupTimeSlot: string;
  paymentMethod: "paystack" | "flutterwave" | "bank_transfer" | "wallet";
}): Promise<{ success: boolean; order?: Order; error?: string }> {
  const cart = await getCart();

  if (cart.items.length === 0) {
    return { success: false, error: "Your basket is empty." };
  }

  const consolidating = needsConsolidation(cart.storesInvolved);
  const originStores = toOriginStoreRefs(cart.storesInvolved);

  if (!consolidating) {
    const origin = cart.storesInvolved[0];
    if (!origin || data.storeId !== origin.id) {
      return {
        success: false,
        error: "Pickup must be at the supermarket that holds your items.",
      };
    }
  }

  const selectedStore = getStoreById(data.storeId);
  if (!selectedStore) {
    return { success: false, error: "Please select a valid store for pickup." };
  }

  if (
    !isValidPickupSlot({
      consolidating,
      pickupDate: data.pickupDate,
      pickupTimeSlot: data.pickupTimeSlot,
    })
  ) {
    return {
      success: false,
      error: consolidating
        ? "That consolidation batch is no longer available. Choose the noon or evening window."
        : "Please choose a valid pickup time window.",
    };
  }

  const session = await getSession();

  if (data.paymentMethod === "wallet") {
    if (!session) {
      return {
        success: false,
        error: "Log in to pay with Stillgood Wallet, or choose Paystack / transfer.",
      };
    }
    const walletResult = await debitWallet(session.id, cart.total);
    if (!walletResult.success) {
      return { success: false, error: walletResult.error };
    }
  }

  const orderId = generateOrderNumber();
  const pickupPin = generatePickupPin();

  const orderItems: OrderItemRecord[] = cart.items.map((item) => ({
    productId: item.product.id,
    productName: item.product.name,
    brand: item.product.brand,
    unit: item.product.unit,
    price: item.product.currentPrice,
    originalPrice: item.product.originalPrice,
    quantity: item.quantity,
    image: item.product.images[0] || "",
    storeId: item.store.id,
    storeName: item.store.name,
    expiryDate: item.product.expiryDate,
  }));

  const order: Order = {
    id: orderId,
    customerId: session?.id,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    items: orderItems,
    storeId: selectedStore.id,
    storeName: selectedStore.name,
    storeAddress: selectedStore.address,
    storeArea: selectedStore.area,
    subtotal: cart.subtotal,
    platformFee: cart.platformFee,
    savingsTotal: cart.savingsTotal,
    total: cart.total,
    status: "confirmed",
    paymentMethod: data.paymentMethod,
    paymentReference: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    pickupDate: data.pickupDate,
    pickupTimeSlot: data.pickupTimeSlot,
    pickupVerificationCode: pickupPin,
    requiresConsolidation: consolidating,
    originStores,
    hubBatch: getHubBatchForSlot(data.pickupTimeSlot, consolidating),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save to in-memory map
  IN_MEMORY_ORDERS.set(order.id, order);

  // Save to orders cookie history
  const cookieStore = await cookies();
  const existingOrdersCookie = cookieStore.get(ORDERS_COOKIE_NAME);
  let orderList: Order[] = [];
  if (existingOrdersCookie?.value) {
    try {
      orderList = JSON.parse(existingOrdersCookie.value);
    } catch {
      orderList = [];
    }
  }
  orderList.unshift(order);
  cookieStore.set(ORDERS_COOKIE_NAME, JSON.stringify(orderList.slice(0, 20)), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  if (session) {
    await updateCustomerProfile(session.id, {
      name: data.customerName.trim() || session.name,
      email: data.customerEmail.trim() || session.email,
    });
  }

  // Empty cart
  await saveRawCartItems([]);

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath(`/order/${order.id}`);

  return { success: true, order };
}

/**
 * Server Action: Retrieve Order by ID
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  if (IN_MEMORY_ORDERS.has(orderId)) {
    return IN_MEMORY_ORDERS.get(orderId)!;
  }

  const cookieStore = await cookies();
  const existingOrdersCookie = cookieStore.get(ORDERS_COOKIE_NAME);
  if (existingOrdersCookie?.value) {
    try {
      const orderList: Order[] = JSON.parse(existingOrdersCookie.value);
      const found = orderList.find((o) => o.id === orderId);
      if (found) {
        IN_MEMORY_ORDERS.set(orderId, found);
        return found;
      }
    } catch {
      // ignore
    }
  }

  return null;
}
