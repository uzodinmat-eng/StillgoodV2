"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Customer, Order } from "./types";
import { DEV_OTP_CODE, normalizeNgPhone } from "./auth-utils";

const CUSTOMERS_COOKIE = "stillgood_customers";
const SESSION_COOKIE = "stillgood_session";
const OTP_COOKIE = "stillgood_otp";
const ORDERS_COOKIE = "stillgood_orders";

async function readCustomers(): Promise<Customer[]> {
  const store = await cookies();
  const raw = store.get(CUSTOMERS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCustomers(customers: Customer[]): Promise<void> {
  const store = await cookies();
  store.set(CUSTOMERS_COOKIE, JSON.stringify(customers.slice(0, 50)), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
  });
}

async function readOrders(): Promise<Order[]> {
  const store = await cookies();
  const raw = store.get(ORDERS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeOrders(orders: Order[]): Promise<void> {
  const store = await cookies();
  store.set(ORDERS_COOKIE, JSON.stringify(orders.slice(0, 20)), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSession(): Promise<Customer | null> {
  const store = await cookies();
  const customerId = store.get(SESSION_COOKIE)?.value;
  if (!customerId) return null;
  const customers = await readCustomers();
  return customers.find((c) => c.id === customerId) ?? null;
}

export async function requestOtp(
  phoneInput: string
): Promise<{ success: boolean; error?: string; phone?: string }> {
  const phone = normalizeNgPhone(phoneInput);
  if (!phone) {
    return {
      success: false,
      error: "Enter a valid Nigerian WhatsApp number (e.g. 0803 456 7890).",
    };
  }

  const store = await cookies();
  store.set(
    OTP_COOKIE,
    JSON.stringify({ phone, code: DEV_OTP_CODE, expiresAt: Date.now() + 10 * 60 * 1000 }),
    {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 10,
    }
  );

  return { success: true, phone };
}

export async function verifyOtp(data: {
  phone: string;
  code: string;
  name?: string;
  email?: string;
}): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  const phone = normalizeNgPhone(data.phone);
  if (!phone) {
    return { success: false, error: "Invalid phone number." };
  }

  const store = await cookies();
  const otpRaw = store.get(OTP_COOKIE)?.value;
  if (!otpRaw) {
    return { success: false, error: "No code was requested. Send a new OTP." };
  }

  try {
    const otp = JSON.parse(otpRaw) as { phone: string; code: string; expiresAt: number };
    if (otp.phone !== phone) {
      return { success: false, error: "Phone number does not match the OTP request." };
    }
    if (Date.now() > otp.expiresAt) {
      return { success: false, error: "That code has expired. Request a new one." };
    }
    if (data.code.trim() !== otp.code && data.code.trim() !== DEV_OTP_CODE) {
      return { success: false, error: "Incorrect code. Use 123456 in this development build." };
    }
  } catch {
    return { success: false, error: "OTP session is invalid. Request a new code." };
  }

  const customers = await readCustomers();
  let customer = customers.find((c) => c.phone === phone);

  if (!customer) {
    customer = {
      id: `cus_${Math.random().toString(36).slice(2, 10)}`,
      name: data.name?.trim() || "Stillgood Shopper",
      phone,
      email: data.email?.trim() || "",
      walletBalance: 0,
      createdAt: new Date().toISOString(),
    };
    customers.unshift(customer);
  } else if (data.name?.trim()) {
    customer = { ...customer, name: data.name.trim() };
    const idx = customers.findIndex((c) => c.id === customer!.id);
    if (idx > -1) customers[idx] = customer;
  }

  await writeCustomers(customers);

  const orders = await readOrders();
  const attached = orders.map((order) => {
    if (normalizeNgPhone(order.customerPhone) === phone && !order.customerId) {
      return { ...order, customerId: customer!.id };
    }
    return order;
  });
  await writeOrders(attached);

  store.set(SESSION_COOKIE, customer.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  store.delete(OTP_COOKIE);

  revalidatePath("/");
  revalidatePath("/account");

  return { success: true, customer };
}

export async function logout(): Promise<{ success: boolean }> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  revalidatePath("/");
  revalidatePath("/account");
  return { success: true };
}

export async function updateCustomerProfile(
  customerId: string,
  patch: Partial<Pick<Customer, "name" | "email" | "walletBalance">>
): Promise<Customer | null> {
  const customers = await readCustomers();
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) return null;
  customers[idx] = { ...customers[idx], ...patch };
  await writeCustomers(customers);
  return customers[idx];
}

export async function debitWallet(
  customerId: string,
  amount: number
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  const customers = await readCustomers();
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) {
    return { success: false, error: "Please log in to pay with Stillgood Wallet." };
  }
  if (customers[idx].walletBalance < amount) {
    return {
      success: false,
      error: "Wallet balance is too low for this order. Choose another payment rail.",
    };
  }
  customers[idx] = {
    ...customers[idx],
    walletBalance: customers[idx].walletBalance - amount,
  };
  await writeCustomers(customers);
  return { success: true, customer: customers[idx] };
}

export async function getAccount(): Promise<{
  customer: Customer | null;
  orders: Order[];
  savingsTotal: number;
}> {
  const customer = await getSession();
  if (!customer) {
    return { customer: null, orders: [], savingsTotal: 0 };
  }

  const orders = (await readOrders()).filter(
    (order) =>
      order.customerId === customer.id ||
      normalizeNgPhone(order.customerPhone) === customer.phone
  );

  const savingsTotal = orders.reduce((sum, order) => sum + (order.savingsTotal || 0), 0);

  return { customer, orders, savingsTotal };
}
