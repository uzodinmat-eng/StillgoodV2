"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { normalizeNgPhone } from "./auth-utils";
import { createServerSupabase } from "./supabase/server";
import { findCustomerByAuthUserId, findCustomerByEmail, insertCustomer, saveCustomer } from "./db/customers";
import { findStoreById, findStoreByOwnerId, insertStore, STORE_AREAS } from "./db/stores";
import { Customer, Store } from "./types";

export type StoreRegistrationInput = {
  businessName: string;
  area: Store["area"];
  address: string;
  phone: string;
  email: string;
  password: string;
  ownerName: string;
  cacNumber?: string;
  storeType?: string;
  openHours?: string;
  pickupInstructions?: string;
};

export async function registerStoreAction(
  input: StoreRegistrationInput
): Promise<{
  success: boolean;
  message?: string;
  needsEmailConfirm?: boolean;
  store?: Store;
  error?: string;
}> {
  const businessName = input.businessName.trim();
  const address = input.address.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const ownerName = input.ownerName.trim();
  const phone = normalizeNgPhone(input.phone) || input.phone.trim();

  if (!businessName) return { success: false, error: "Enter the supermarket or business name." };
  if (!address) return { success: false, error: "Enter the physical store address." };
  if (!email || !email.includes("@")) return { success: false, error: "Enter a valid contact email." };
  if (!password || password.length < 6) return { success: false, error: "Password must be at least 6 characters." };
  if (!phone) return { success: false, error: "Enter a valid phone number." };
  if (!ownerName) return { success: false, error: "Enter the owner or manager's full name." };
  if (!STORE_AREAS.includes(input.area)) {
    return { success: false, error: "Please select a valid Abuja area." };
  }

  const supabase = await createServerSupabase();

  // 1. Sign up auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: ownerName,
        business_name: businessName,
      },
    },
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  const user = authData.user;
  if (!user) {
    return { success: false, error: "Unable to create store login credentials." };
  }

  // 2. Ensure customer record exists with role 'store_owner'
  let customer =
    (await findCustomerByAuthUserId(user.id)) ||
    (await findCustomerByEmail(email));

  if (!customer) {
    customer = {
      id: `cus_${user.id.replace(/-/g, "").slice(0, 12)}`,
      name: ownerName,
      phone,
      email,
      walletBalance: 0,
      createdAt: new Date().toISOString(),
      authUserId: user.id,
      role: "store_owner",
    };
    await insertCustomer(customer);
  } else {
    customer = {
      ...customer,
      name: ownerName || customer.name,
      phone: phone || customer.phone,
      authUserId: user.id,
      role: "store_owner",
    };
    await saveCustomer(customer);
  }

  // 3. Create store with pending status linked to owner
  const store = await insertStore({
    name: businessName,
    area: input.area,
    address,
    phone,
    openHours: input.openHours?.trim() || "8:00 AM – 9:00 PM (Daily)",
    pickupInstructions:
      input.pickupInstructions?.trim() ||
      "Pick up in person or send a dispatch rider. Present your order number SG-XXXXX and 4-digit PIN at the customer care desk.",
    status: "pending",
    ownerId: customer.id,
    cacNumber: input.cacNumber?.trim() || undefined,
    storeType: input.storeType?.trim() || "supermarket",
  });

  // Link store_id on customer
  customer.storeId = store.id;
  await saveCustomer(customer);

  revalidatePath("/admin");
  revalidatePath("/stores");

  const needsEmailConfirm = !authData.session;

  return {
    success: true,
    needsEmailConfirm,
    store,
    message: needsEmailConfirm
      ? "Store registered! Please check your email to confirm your account. Admin will review your application."
      : "Store registered successfully! Your account is pending admin approval before listing items.",
  };
}
