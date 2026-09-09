"use server";

import { revalidatePath } from "next/cache";
import { customerIsAdmin } from "./auth-utils";
import { ensureCustomerFromUser } from "./auth";
import { createServerSupabase } from "./supabase/server";
import type { Customer } from "./types";

const ADMIN_EMAIL = "admin@stillgood.local";
const DEFAULT_ADMIN_USERNAME = "uzodinmat";
const GENERIC_ERROR = "Invalid username or password.";

export async function signInAdminWithUsername(data: {
  username: string;
  password: string;
}): Promise<{
  success: boolean;
  customer?: Customer;
  error?: string;
}> {
  const username = data.username.trim().toLowerCase();
  const allowedUsername = (process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME)
    .trim()
    .toLowerCase();

  if (!username || !data.password || username !== allowedUsername) {
    return { success: false, error: GENERIC_ERROR };
  }

  const supabase = await createServerSupabase();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: data.password,
  });

  if (error || !authData.user) {
    return { success: false, error: GENERIC_ERROR };
  }

  const customer = await ensureCustomerFromUser(authData.user);
  if (!customerIsAdmin(customer)) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    return { success: false, error: GENERIC_ERROR };
  }

  revalidatePath("/admin");
  return { success: true, customer };
}
