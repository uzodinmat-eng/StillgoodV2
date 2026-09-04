-- Link Stillgood customers to Supabase Auth users.
-- Email is the buyer login key. Phone stays a checkout/pickup contact.
-- OTP is not used for customers.

alter table public.customers
  add column if not exists auth_user_id text unique;

alter table public.customers
  drop constraint if exists customers_phone_key;

alter table public.customers
  alter column phone drop not null;

alter table public.customers
  add constraint customers_phone_key unique (phone);

create unique index if not exists customers_email_lower_idx
  on public.customers (lower(email))
  where email is not null and btrim(email) <> '';

comment on column public.customers.auth_user_id is 'Supabase Auth user id. Buyer login is email or Google, not OTP.';
comment on column public.customers.email is 'Primary buyer login identifier.';
comment on column public.customers.phone is 'Pickup WhatsApp contact collected at checkout, not a login.';
