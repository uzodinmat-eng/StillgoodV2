"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { Customer, Order } from "./types";
import {
  attachGuestOrders,
  findCustomerByAuthUserId,
  findCustomerByEmail,
  findCustomerById,
  insertCustomer,
  saveCustomer,
} from "./db/customers";
import { findOrdersForCustomer } from "./db/orders";
import { isSupabaseAuthConfigured } from "./supabase/env";
import { createServerSupabase } from "./supabase/server";

function displayNameFromUser(user: User, fallback?: string): string {
  const meta = user.user_metadata || {};
  const fromMeta =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    "";
  return fallback?.trim() || fromMeta || user.email?.split("@")[0] || "Stillgood Shopper";
}

export async function ensureCustomerFromUser(
  user: User,
  extras?: { name?: string }
): Promise<Customer> {
  const email = (user.email || "").trim().toLowerCase();
  let customer =
    (await findCustomerByAuthUserId(user.id)) ||
    (email ? await findCustomerByEmail(email) : null);

  const name = displayNameFromUser(user, extras?.name);

  if (!customer) {
    customer = {
      id: `cus_${user.id.replace(/-/g, "").slice(0, 12)}`,
      name,
      phone: "",
      email,
      walletBalance: 0,
      createdAt: new Date().toISOString(),
      authUserId: user.id,
    };
    await insertCustomer(customer);
  } else {
    const next: Customer = {
      ...customer,
      authUserId: user.id,
      email: email || customer.email,
      name: extras?.name?.trim() || customer.name || name,
    };
    if (
      next.authUserId !== customer.authUserId ||
      next.email !== customer.email ||
      next.name !== customer.name
    ) {
      await saveCustomer(next);
      customer = next;
    }
  }

  await attachGuestOrders(customer.id, {
    email: customer.email,
    phone: customer.phone,
  });

  return customer;
}

async function accountPayload(customer: Customer): Promise<{
  customer: Customer;
  orders: Order[];
  savingsTotal: number;
}> {
  const orders = await findOrdersForCustomer({
    customerId: customer.id,
    email: customer.email,
    phone: customer.phone,
  });
  const savingsTotal = orders.reduce((sum, order) => sum + (order.savingsTotal || 0), 0);
  return { customer, orders, savingsTotal };
}

export async function getSession(): Promise<Customer | null> {
  if (!isSupabaseAuthConfigured()) return null;
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return ensureCustomerFromUser(data.user);
  } catch {
    return null;
  }
}

export async function signUpWithEmail(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<{
  success: boolean;
  customer?: Customer;
  orders?: Order[];
  savingsTotal?: number;
  needsConfirmation?: boolean;
  error?: string;
}> {
  const email = data.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { success: false, error: "Enter a valid email address." };
  }
  if (data.password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  const supabase = await createServerSupabase();
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password: data.password,
    options: {
      data: { full_name: data.name?.trim() || "" },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  if (!authData.session || !authData.user) {
    return {
      success: true,
      needsConfirmation: true,
    };
  }

  const customer = await ensureCustomerFromUser(authData.user, { name: data.name });
  const payload = await accountPayload(customer);
  revalidatePath("/");
  revalidatePath("/account");
  return { success: true, ...payload };
}

export async function signInWithEmail(data: {
  email: string;
  password: string;
}): Promise<{
  success: boolean;
  customer?: Customer;
  orders?: Order[];
  savingsTotal?: number;
  error?: string;
}> {
  const email = data.email.trim().toLowerCase();
  if (!email || !data.password) {
    return { success: false, error: "Enter your email and password." };
  }

  const supabase = await createServerSupabase();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password: data.password,
  });

  if (error || !authData.user) {
    return { success: false, error: error?.message || "Could not sign in." };
  }

  const customer = await ensureCustomerFromUser(authData.user);
  const payload = await accountPayload(customer);
  revalidatePath("/");
  revalidatePath("/account");
  return { success: true, ...payload };
}

export async function logout(): Promise<{ success: boolean }> {
  if (isSupabaseAuthConfigured()) {
    try {
      const supabase = await createServerSupabase();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  revalidatePath("/");
  revalidatePath("/account");
  return { success: true };
}

export async function updateCustomerProfile(
  customerId: string,
  patch: Partial<Pick<Customer, "name" | "email" | "walletBalance" | "phone">>
): Promise<Customer | null> {
  const customer = await findCustomerById(customerId);
  if (!customer) return null;
  const next = { ...customer, ...patch };
  await saveCustomer(next);
  return next;
}

export async function debitWallet(
  customerId: string,
  amount: number
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  const customer = await findCustomerById(customerId);
  if (!customer) {
    return { success: false, error: "Please log in to pay with Stillgood Wallet." };
  }
  if (customer.walletBalance < amount) {
    return {
      success: false,
      error: "Wallet balance is too low for this order. Choose another payment rail.",
    };
  }
  const next = {
    ...customer,
    walletBalance: customer.walletBalance - amount,
  };
  await saveCustomer(next);
  return { success: true, customer: next };
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
  return accountPayload(customer);
}
