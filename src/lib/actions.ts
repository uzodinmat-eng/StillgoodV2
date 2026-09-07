"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  findProductInCatalog,
  findStoreInCatalog,
} from "./catalog";
import { loadCatalog } from "./db/catalog";
import { calculateOrderSummary } from "./fees";
import { CartItem, CartSummary, Order, OrderItemRecord, PopulatedCartItem, Store } from "./types";
import {
  autoAssignHubBatch,
  isValidPickupSlot,
  needsConsolidation,
  toOriginStoreRefs,
} from "./fulfillment";
import { debitWallet, getSession, updateCustomerProfile } from "./auth";
import { normalizeNgPhone } from "./auth-utils";
import { findOrderById, insertOrder } from "./db/orders";
import { createOrderPayment, findOrderPayment, markPaystackPaymentSuccessful } from "./db/payments";
import { verifyPaystackTransaction } from "./paystack";
import { initializePaystackTransaction } from "./paystack";

const CART_COOKIE_NAME = "stillgood_cart";

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
  const catalog = await loadCatalog();
  
  const populatedItems: PopulatedCartItem[] = [];

  for (const raw of rawItems) {
    const product = findProductInCatalog(catalog, raw.productId);
    if (product) {
      const store = findStoreInCatalog(catalog, product.storeId);
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

  const catalog = await loadCatalog();
  const product = findProductInCatalog(catalog, productId);
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
    const catalog = await loadCatalog();
    const product = findProductInCatalog(catalog, productId);
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
  }): Promise<{ success: boolean; order?: Order; checkoutUrl?: string; error?: string }> {
  const cart = await getCart();

  if (cart.items.length === 0) {
    return { success: false, error: "Your basket is empty." };
  }

  const consolidating = needsConsolidation(cart.storesInvolved);
  const originStores = toOriginStoreRefs(cart.storesInvolved);
  const originStore = cart.storesInvolved[0];

  // Hub assignment is server-side for consolidation orders: the client cannot
  // choose the batch, and orders.store_id anchors to a real partner store.
  let selectedStore: Store | undefined;
  let pickupDate = data.pickupDate;
  let pickupTimeSlot = data.pickupTimeSlot;
  let hubBatch: "noon" | "evening" | null = null;

  if (consolidating) {
    const assignment = autoAssignHubBatch();
    pickupDate = assignment.pickupDate;
    pickupTimeSlot = assignment.pickupTimeSlot;
    hubBatch = assignment.batch;
    selectedStore = originStore;
  } else {
    if (!originStore || data.storeId !== originStore.id) {
      return {
        success: false,
        error: "Pickup must be at the supermarket that holds your items.",
      };
    }
    const catalog = await loadCatalog();
    selectedStore = findStoreInCatalog(catalog, data.storeId);
    if (!selectedStore) {
      return { success: false, error: "Please select a valid store for pickup." };
    }
    if (!isValidPickupSlot({ consolidating, pickupDate, pickupTimeSlot })) {
      return {
        success: false,
        error: "Please choose a valid pickup time window.",
      };
    }
  }

  if (!selectedStore) {
    return { success: false, error: "Please select a valid store for pickup." };
  }

  const customerPhone = normalizeNgPhone(data.customerPhone);
  if (!customerPhone) {
    return {
      success: false,
      error: "Enter a valid Nigerian WhatsApp number (e.g. 0803 456 7890).",
    };
  }

  const customerEmail = data.customerEmail.trim().toLowerCase();
  if (!customerEmail || !customerEmail.includes("@")) {
    return { success: false, error: "Enter a valid email for your pickup receipt." };
  }

  const session = await getSession();

  if (data.paymentMethod !== "paystack") {
    return { success: false, error: "Paystack is the only supported payment method at launch." };
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
    customerEmail,
    customerPhone,
    items: orderItems,
    storeId: selectedStore.id,
    storeName: selectedStore.name,
    storeAddress: selectedStore.address,
    storeArea: selectedStore.area,
    subtotal: cart.subtotal,
    platformFee: cart.platformFee,
    pickupFee: cart.pickupFee,
    savingsTotal: cart.savingsTotal,
    total: cart.total,
    status: "pending_payment",
    paymentMethod: data.paymentMethod,
    paymentReference: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    pickupDate,
    pickupTimeSlot,
    pickupVerificationCode: pickupPin,
    requiresConsolidation: consolidating,
    originStores,
    hubBatch,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let inserted = false;
  for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
    try {
      await insertOrder(order);
      inserted = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/unique|duplicate|orders_pkey/i.test(message) || attempt === 4) throw error;
      // A customer should never be asked to resubmit because a random display ID collided.
      order.id = generateOrderNumber();
      order.paymentReference = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
  }

  const paymentId = `pay_${order.id}`;
  const paymentReference = `sg_${order.id.toLowerCase()}_${Date.now()}`;
  await createOrderPayment({ id: paymentId, orderId: order.id, amount: order.total, reference: paymentReference });
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://stillgood-swart.vercel.app";
  const payment = await initializePaystackTransaction({
    email: customerEmail,
    amountNaira: order.total,
    reference: paymentReference,
    callbackUrl: `${origin}/order/${order.id}?paid=1`,
    metadata: { order_id: order.id, payment_id: paymentId },
  });

  if (session) {
    await updateCustomerProfile(session.id, {
      name: data.customerName.trim() || session.name,
      email: customerEmail || session.email,
      phone: customerPhone || session.phone,
    });
  }

  // Keep the cart until Paystack confirms payment.
  const checkoutUrl = payment.authorization_url;

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath(`/order/${order.id}`);

  return { success: true, order, checkoutUrl };
}

/**
 * Server Action: Retrieve Order by ID
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const normalized = orderId.trim().toUpperCase();
  const order = await findOrderById(normalized);

  // Self-healing path: if the webhook is delayed or never fired, verify the
  // payment directly with Paystack when the customer opens the order page.
  if (order && order.status === "pending_payment") {
    const payment = await findOrderPayment(order.id);
    if (payment && payment.status === "pending") {
      const verified = await verifyPaystackTransaction(payment.gatewayReference);
      if (verified && verified.status === "success" && verified.currency === "NGN") {
        const naira = Math.round(verified.amount / 100);
        await markPaystackPaymentSuccessful(payment.gatewayReference, naira);
        return findOrderById(normalized);
      }
    }
  }

  return order;
}
