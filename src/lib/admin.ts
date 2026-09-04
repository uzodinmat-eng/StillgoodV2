"use server";

import { revalidatePath } from "next/cache";
import { customerIsAdmin, getSession } from "./auth";
import { listAllOrders } from "./db/orders";
import { insertStore, listStores, STORE_AREAS } from "./db/stores";
import { Customer, Order, Store } from "./types";

export type AdminStoreInput = {
  name: string;
  area: Store["area"];
  address: string;
  phone: string;
  openHours?: string;
  pickupInstructions?: string;
};

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

export async function getAdminDesk(): Promise<{
  customer: Customer | null;
  isAdmin: boolean;
  stores: Store[];
  orders: Order[];
  areas: Store["area"][];
}> {
  const customer = await getSession();
  const isAdmin = customerIsAdmin(customer);
  if (!isAdmin) {
    return {
      customer,
      isAdmin: false,
      stores: [],
      orders: [],
      areas: STORE_AREAS,
    };
  }
  const [stores, orders] = await Promise.all([listStores(), listAllOrders(100)]);
  return { customer, isAdmin: true, stores, orders, areas: STORE_AREAS };
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
