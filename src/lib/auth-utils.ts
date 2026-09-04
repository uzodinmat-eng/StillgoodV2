import type { Customer, CustomerRole } from "./types";

export function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function emailIsAdmin(email: string | undefined | null): boolean {
  const normalized = email?.trim().toLowerCase() || "";
  return normalized.length > 0 && adminAllowlist().includes(normalized);
}

export function customerIsAdmin(
  customer: Pick<Customer, "email" | "role"> | null
): boolean {
  if (!customer) return false;
  return customer.role === "admin" || emailIsAdmin(customer.email);
}

export function roleForEmail(email: string, existing?: CustomerRole): CustomerRole {
  if (emailIsAdmin(email)) return "admin";
  if (existing === "store_owner") return "store_owner";
  return existing || "customer";
}

export function normalizeNgPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length >= 13) {
    return `+${digits.slice(0, 13)}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+234${digits}`;
  }
  return null;
}
