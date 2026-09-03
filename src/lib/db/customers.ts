import { Customer } from "@/lib/types";
import { asInt, execute, isoTimestamp, queryOne } from "./client";

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  wallet_balance: number | string;
  created_at: Date | string;
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    walletBalance: asInt(row.wallet_balance),
    createdAt: isoTimestamp(row.created_at),
  };
}

export async function findCustomerById(id: string): Promise<Customer | null> {
  const row = await queryOne<CustomerRow>(
    `select id, name, phone, email, wallet_balance, created_at
     from public.customers where id = $1`,
    [id]
  );
  return row ? mapCustomer(row) : null;
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const row = await queryOne<CustomerRow>(
    `select id, name, phone, email, wallet_balance, created_at
     from public.customers where phone = $1`,
    [phone]
  );
  return row ? mapCustomer(row) : null;
}

export async function insertCustomer(customer: Customer): Promise<Customer> {
  await execute(
    `insert into public.customers (id, name, phone, email, wallet_balance, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $6)`,
    [
      customer.id,
      customer.name,
      customer.phone,
      customer.email,
      customer.walletBalance,
      customer.createdAt,
    ]
  );
  return customer;
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  await execute(
    `update public.customers
     set name = $2, email = $3, wallet_balance = $4, updated_at = now()
     where id = $1`,
    [customer.id, customer.name, customer.email, customer.walletBalance]
  );
  return customer;
}

export async function attachGuestOrders(customerId: string, phone: string): Promise<void> {
  await execute(
    `update public.orders
     set customer_id = $1, updated_at = now()
     where customer_id is null
       and regexp_replace(customer_phone, '[^0-9]', '', 'g')
         = regexp_replace($2, '[^0-9]', '', 'g')`,
    [customerId, phone]
  );
}
