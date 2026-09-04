import { Customer, CustomerRole } from "@/lib/types";
import { asInt, execute, isoTimestamp, queryOne } from "./client";

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  wallet_balance: number | string;
  created_at: Date | string;
  auth_user_id?: string | null;
  role?: string | null;
}

function asRole(value: string | null | undefined): CustomerRole {
  if (value === "admin" || value === "store_owner") return value;
  return "customer";
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || "",
    email: row.email || "",
    walletBalance: asInt(row.wallet_balance),
    createdAt: isoTimestamp(row.created_at),
    authUserId: row.auth_user_id || undefined,
    role: asRole(row.role),
  };
}

const CUSTOMER_COLUMNS = `id, name, phone, email, wallet_balance, created_at, auth_user_id, role`;

export async function findCustomerById(id: string): Promise<Customer | null> {
  const row = await queryOne<CustomerRow>(
    `select ${CUSTOMER_COLUMNS} from public.customers where id = $1`,
    [id]
  );
  return row ? mapCustomer(row) : null;
}

export async function findCustomerByAuthUserId(
  authUserId: string
): Promise<Customer | null> {
  const row = await queryOne<CustomerRow>(
    `select ${CUSTOMER_COLUMNS} from public.customers where auth_user_id = $1`,
    [authUserId]
  );
  return row ? mapCustomer(row) : null;
}

export async function findCustomerByEmail(email: string): Promise<Customer | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const row = await queryOne<CustomerRow>(
    `select ${CUSTOMER_COLUMNS}
     from public.customers
     where lower(email) = $1
     limit 1`,
    [normalized]
  );
  return row ? mapCustomer(row) : null;
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const row = await queryOne<CustomerRow>(
    `select ${CUSTOMER_COLUMNS} from public.customers where phone = $1`,
    [phone]
  );
  return row ? mapCustomer(row) : null;
}

export async function insertCustomer(customer: Customer): Promise<Customer> {
  await execute(
    `insert into public.customers (id, name, phone, email, wallet_balance, created_at, updated_at, auth_user_id, role)
     values ($1, $2, $3, $4, $5, $6, $6, $7, $8)`,
    [
      customer.id,
      customer.name,
      customer.phone?.trim() ? customer.phone : null,
      customer.email,
      customer.walletBalance,
      customer.createdAt,
      customer.authUserId ?? null,
      customer.role || "customer",
    ]
  );
  return customer;
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  await execute(
    `update public.customers
     set name = $2, email = $3, phone = $4, wallet_balance = $5, auth_user_id = $6, role = $7, updated_at = now()
     where id = $1`,
    [
      customer.id,
      customer.name,
      customer.phone?.trim() ? customer.phone : null,
      customer.email,
      customer.walletBalance,
      customer.authUserId ?? null,
      customer.role || "customer",
    ]
  );
  return customer;
}

export async function attachGuestOrders(
  customerId: string,
  options: { email?: string; phone?: string }
): Promise<void> {
  await execute(
    `update public.orders
     set customer_id = $1, updated_at = now()
     where customer_id is null
       and (
         ($2 <> '' and lower(customer_email) = lower($2))
         or (
           $3 <> ''
           and regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g')
             = regexp_replace($3, '[^0-9]', '', 'g')
         )
       )`,
    [customerId, options.email?.trim() || "", options.phone?.trim() || ""]
  );
}
