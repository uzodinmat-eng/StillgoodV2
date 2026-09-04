-- Additive. Existing customers become role=customer.
-- admin | store_owner are for /admin and a later store home.

alter table public.customers
  add column if not exists role text not null default 'customer';

alter table public.customers
  drop constraint if exists customers_role_check;

alter table public.customers
  add constraint customers_role_check
  check (role in ('customer', 'admin', 'store_owner'));

comment on column public.customers.role is
  'customer | admin | store_owner. Buyer login is unchanged. Admin emails in ADMIN_EMAILS are promoted on sign-in.';
