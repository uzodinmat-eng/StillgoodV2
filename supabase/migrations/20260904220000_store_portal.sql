-- Migration: Add store status, owner link, and customer store_id link.
-- Additive only.

alter table public.stores
  add column if not exists status text not null default 'approved';

alter table public.stores
  drop constraint if exists stores_status_check;

alter table public.stores
  add constraint stores_status_check
  check (status in ('pending', 'approved', 'suspended'));

alter table public.stores
  add column if not exists owner_id text references public.customers (id);

alter table public.stores
  add column if not exists cac_number text;

alter table public.stores
  add column if not exists store_type text not null default 'supermarket';

alter table public.customers
  add column if not exists store_id text references public.stores (id);

comment on column public.stores.status is 'pending | approved | suspended. Public catalog only shows approved stores.';
comment on column public.stores.owner_id is 'Optional customer ID for store owner.';
comment on column public.customers.store_id is 'Linked store ID if role is store_owner.';
