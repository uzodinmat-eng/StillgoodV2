-- Stillgood initial schema (PostgreSQL / Supabase).
-- Apply with: supabase db push
-- or paste this file into the Supabase SQL editor, then run supabase/seed.sql.

create table if not exists public.stores (
  id text primary key,
  name text not null,
  slug text not null unique,
  area text not null,
  address text not null,
  phone text not null,
  rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  open_hours text not null,
  pickup_instructions text not null,
  image_url text not null,
  banner_image_url text,
  lat double precision not null,
  lng double precision not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  icon text not null,
  description text not null,
  item_count integer not null default 0,
  gradient text not null,
  bg_light text not null
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  brand text not null,
  slug text not null unique,
  category_id text not null references public.categories (id),
  store_id text not null references public.stores (id),
  description text not null,
  unit text not null,
  images text[] not null default '{}',
  original_price integer not null,
  base_discount_percent numeric(5, 2) not null,
  date_type text not null check (date_type in ('best_before', 'use_by', 'expiry')),
  expiry_date date not null,
  listed_at date not null,
  drift_rate_weekly numeric(6, 4) not null default 0.025,
  stock_quantity integer not null default 0,
  featured boolean not null default false,
  storage_condition text not null check (storage_condition in ('ambient', 'chilled', 'frozen')),
  nafdac_reg_no text,
  condition_notes text,
  nutritional_highlights text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_review_scores (
  store_id text primary key references public.stores (id) on delete cascade,
  freshness_score numeric(3, 2) not null,
  handoff_speed_score numeric(3, 2) not null,
  cleanliness_score numeric(3, 2) not null
);

create table if not exists public.store_reviews (
  id text primary key,
  store_id text not null references public.stores (id) on delete cascade,
  customer_name text not null,
  rating numeric(3, 2) not null,
  reviewed_on text not null,
  comment text not null,
  verified_pickup boolean not null default true,
  user_type text not null check (user_type in ('Customer', 'Dispatch Rider'))
);

create table if not exists public.customers (
  id text primary key,
  name text not null,
  phone text not null unique,
  email text not null default '',
  wallet_balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  customer_id text references public.customers (id),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  store_id text not null references public.stores (id),
  store_name text not null,
  store_address text not null,
  store_area text not null,
  subtotal integer not null,
  platform_fee integer not null,
  savings_total integer not null,
  total integer not null,
  status text not null check (
    status in (
      'pending_payment',
      'confirmed',
      'ready_for_pickup',
      'picked_up',
      'cancelled'
    )
  ),
  payment_method text not null check (
    payment_method in ('paystack', 'flutterwave', 'bank_transfer', 'wallet')
  ),
  payment_reference text not null,
  pickup_date date not null,
  pickup_time_slot text not null,
  pickup_verification_code text not null,
  requires_consolidation boolean not null default false,
  origin_stores jsonb not null default '[]'::jsonb,
  hub_batch text check (hub_batch is null or hub_batch in ('noon', 'evening')),
  picked_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id text primary key,
  order_id text not null references public.orders (id) on delete cascade,
  product_id text not null,
  product_name text not null,
  brand text not null,
  unit text not null,
  price integer not null,
  original_price integer not null,
  quantity integer not null,
  image_url text not null default '',
  store_id text not null,
  store_name text not null,
  expiry_date date not null,
  sort_index integer not null default 0
);

create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_customer_phone_idx on public.orders (customer_phone);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists products_store_id_idx on public.products (store_id);
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_slug_idx on public.products (slug);

comment on table public.orders is 'SG-XXXXX is the order label, not a login identifier.';
comment on column public.orders.pickup_verification_code is '4-digit PIN shown on the pickup pass.';
comment on column public.customers.wallet_balance is 'Integer Nigerian Naira. Missing-item refunds credit here.';
