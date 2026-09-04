# Data Model

Postgres (Supabase). SQL below is illustrative, not final migrations — Sprint 0 turns this into
real migration files. Naming: snake_case, `id uuid primary key default gen_random_uuid()`,
`created_at/updated_at timestamptz` on everything (omitted below for brevity).

## Entity overview

```
businesses ─┬─ stores (branches) ─┬─ staff (attendants, PIN)
            │                     ├─ items ── item_price_schedule
            │                     └─ sub_orders ── sub_order_items
            └─ business settlement account
users (customers) ─┬─ carts ── cart_items
                   ├─ orders ── order_payments (one+ Paystack charges per order)
                   │         └─ sub_orders (per store)
                   ├─ wallets ── ledger_entries
                   ├─ ratings
                   └─ notifications
admin: config, audit_log, analytics are views/rollups over the above
```

## Tables

### Identity

```sql
-- Supabase auth.users holds credentials; this is the app profile.
create table profiles (
  id uuid primary key references auth.users,
  role text not null default 'customer',        -- customer | store_owner | admin
  full_name text,
  phone text unique,                            -- E.164, null until verified
  phone_verified_at timestamptz,
  avatar_url text,
  state_pref text,                              -- e.g. 'FCT'
  address text,                                 -- optional; customer-arranged rider, not platform delivery
  email_notifications boolean default true,
  push_notifications boolean default true,
  deleted_at timestamptz                        -- soft delete
);
```

### Stores

```sql
create table businesses (
  id uuid primary key,
  owner_id uuid references profiles,
  name text not null,
  cac_number text not null,
  status text not null default 'pending',       -- pending | approved | suspended
  settlement_bank_code text,
  settlement_account_number text,
  settlement_account_name text                  -- resolved via Paystack
);

create table stores (                            -- a branch
  id uuid primary key,
  business_id uuid references businesses,
  name text not null,                            -- "Bakan Gizo — Gwarinpa 1st Ave"
  store_type text not null,                      -- market | supermarket | restaurant | ...
  state text not null,
  address text not null,
  is_active boolean default true,
  rating_avg numeric(3,2) default 0,
  rating_count int default 0
);

create table staff (
  id uuid primary key,
  store_id uuid references stores,
  display_name text not null,
  pin_hash text not null,                        -- bcrypt; PIN is 4-6 digits
  is_active boolean default true
);

create table staff_events (                      -- audit trail
  id uuid primary key,
  staff_id uuid references staff,
  event text not null,                           -- login | item_created | item_edited |
  ref_id uuid,                                   --   order_confirmed | item_marked_unavailable | ...
  meta jsonb
);
```

### Catalog

```sql
create table categories (
  id uuid primary key,
  name text not null,                            -- global list, admin-curated
  store_id uuid references stores               -- null = global; set = store-custom
);

create table items (
  id uuid primary key,
  store_id uuid references stores,
  category_id uuid references categories,
  name text not null,
  description text,                              -- AI-generated, editable
  image_url text not null,                       -- 1:1, Supabase storage
  original_price numeric(12,2),                  -- shelf price, for the strikethrough
  start_price numeric(12,2),                     -- decay mode start (null in fixed mode)
  floor_price numeric(12,2) not null,            -- "last price"
  current_price numeric(12,2) not null,          -- what the buyer pays right now
  quantity int not null check (quantity >= 0),
  expiry_date date not null,
  status text not null default 'live',           -- live | archived | deleted
  listed_by_staff uuid references staff
);
-- Nightly pg_cron job:
--   1. recompute current_price for decay-mode items (linear from start to floor by expiry month)
--   2. set status='archived' where expiry_date <= today or quantity = 0
```

### Carts

Server-side carts (needed for the "in N other carts" counter and cross-device carts).

```sql
create table carts (
  id uuid primary key,
  user_id uuid references profiles unique,       -- one active cart per user
  attached_order_id uuid references orders,      -- set while topping up an open order; else null
  updated_at timestamptz
);

create table cart_items (
  cart_id uuid references carts,
  item_id uuid references items,
  quantity int not null check (quantity > 0),
  primary key (cart_id, item_id)
);
-- "in N other carts" = count(distinct cart_id) where item_id = X
--   and cart updated within 7 days. Cache ~60s.
```

### Orders

The key structural decision: a customer **order** fans out into per-store **sub_orders**.
Stores only ever query their own sub_orders; admin sees the whole order.

An order can have **several Paystack charges** (initial checkout + each card-funded top-up).
`gateway_ref` lives on `order_payments`, not on `orders`.

`picking_surcharge` is **mutable via top-up**: it starts at `800 + 500*(store_count − 1)` and
increases by ₦500 each time a top-up introduces a store that was not already on the order.

```sql
create table orders (
  id uuid primary key,
  order_no text unique not null,                 -- short human code, e.g. SG-84F2K
  user_id uuid references profiles,
  items_subtotal numeric(12,2) not null,         -- grows with top-ups
  picking_surcharge numeric(12,2) not null,      -- 800 + 500*(store_count - 1); +500 per new store on top-up
  total numeric(12,2) not null,                  -- items_subtotal + picking_surcharge
  wallet_applied numeric(12,2) default 0,        -- cumulative across initial + top-ups
  status text not null default 'pending_payment'
  -- pending_payment | paid | partially_fulfilled | fulfilled | cancelled | refunded | forfeited
);

create table order_payments (
  id uuid primary key,
  order_id uuid references orders,
  kind text not null,                            -- initial | top_up
  amount numeric(12,2) not null,                 -- card portion of this charge
  wallet_applied numeric(12,2) default 0,
  picking_surcharge_delta numeric(12,2) default 0, -- 0, or 500 per new store on this top-up
  gateway text default 'paystack',
  gateway_ref text unique,                       -- Paystack reference; null until initialized
  status text not null default 'pending'
  -- pending | success | failed
);

create table sub_orders (
  id uuid primary key,
  order_id uuid references orders,
  store_id uuid references stores,
  subtotal numeric(12,2) not null,               -- grows if this store is topped up
  commission numeric(12,2) not null default 0,
  pickup_code text not null,                     -- 4 digits, typed by attendant (no QR)
  status text not null default 'pending',
  -- pending | picking | confirmed | ready | completed | cancelled | refunded | forfeited
  -- A top-up to a confirmed/ready sub_order returns it to pending for re-picking.
  -- A top-up that adds a new store creates a new sub_order under the same order.
  confirmed_by_staff uuid references staff,
  completed_at timestamptz,
  pickup_deadline timestamptz                    -- 48h after latest ready; past it: forfeited, no refund
);

create table sub_order_items (
  id uuid primary key,
  sub_order_id uuid references sub_orders,
  item_id uuid references items,
  name_snapshot text not null,                   -- item may be edited later; freeze what was sold
  unit_price numeric(12,2) not null,
  quantity int not null,
  availability text default 'unknown',           -- unknown | available | unavailable
  added_via text not null default 'initial'      -- initial | top_up
);
```

Top-up rules encoded here:

- Cart with `attached_order_id` set: checkout writes a new `order_payments` row (`kind=top_up`)
  and either appends `sub_order_items` to an existing sub_order (same store) or inserts a new
  `sub_orders` row (new store). Same-store appends set that sub_order back to `pending`.
- Released (`completed`) sub_orders are closed: top-ups cannot add items to them. An order with
  every sub_order `completed` cannot be topped up at all.

### Money (see `03-payments-and-wallet.md` for flow)

One wallet per customer, one per business, plus a platform wallet. Balances are **never stored
as a mutable column** — they're the sum of an append-only double-entry ledger. This is the single
most important integrity decision in the system.

```sql
create table wallets (
  id uuid primary key,
  owner_type text not null,                      -- customer | business | platform
  owner_id uuid                                  -- null for the platform wallet
);

create table ledger_entries (
  id bigint generated always as identity primary key,
  txn_id uuid not null,                          -- groups the two legs of one transaction
  wallet_id uuid references wallets,
  amount numeric(12,2) not null,                 -- positive = credit, negative = debit
  kind text not null,
  -- payment_in | item_refund | order_payout_pending | payout_release | commission |
  -- picking_surcharge | forfeiture_release |
  -- withdrawal | withdrawal_fee | refund_fee | manual_adjustment
  -- payment_in / withdrawal legs are written only from verified Paystack webhooks or
  -- verify endpoints; a daily job reconciles against Paystack's transaction/transfer lists
  ref_type text, ref_id uuid,                    -- e.g. ('order_payment', ...) or ('sub_order', ...)
  note text
);
-- Invariant enforced in application code + a check job:
--   sum(amount) over each txn_id = 0  (every credit has a matching debit)
-- balance(wallet) = sum(amount) where wallet_id = X

create table withdrawals (
  id uuid primary key,
  wallet_id uuid references wallets,
  amount numeric(12,2) not null,
  fee numeric(12,2) not null,
  transfer_ref text,                             -- Paystack transfer code
  status text not null default 'processing'      -- processing | success | failed
);
```

### Ratings, notifications, config

```sql
create table ratings (
  id uuid primary key,
  user_id uuid references profiles,
  store_id uuid references stores,
  sub_order_id uuid references sub_orders unique, -- one rating per fulfilled sub-order
  stars int not null check (stars between 1 and 5),
  comment text
);

create table notifications (
  id uuid primary key,
  user_id uuid,                                   -- or staff/store target
  audience text not null,                         -- customer | store | admin
  title text not null,
  body text,
  ref_type text, ref_id uuid,
  read_at timestamptz,
  channels text[] default '{push}'                -- push | email | sms
);

create table app_config (                         -- admin-editable knobs, with launch values
  key text primary key,                           -- withdrawal_fee_ngn = 50
  value jsonb not null                            -- refund_fee_ngn = 100
);                                                -- commission_pct = 10 (range 10-12)
                                                  -- picking_surcharge_base_ngn = 800
                                                  -- picking_surcharge_per_extra_store_ngn = 500
                                                  -- pickup_window_hours = 48
                                                  -- min_days_to_expiry = 7
```

## Row-level security sketch (Supabase)

- `profiles`: user reads/writes own row; admin reads all.
- `items`: public read where `status='live'` and store approved; write only by that store's
  staff session; admin all.
- `sub_orders` + children: customer reads own (via order), store reads/writes own store's,
  admin all.
- `order_payments`: customer reads own; **no client writes**. Created by server checkout.
- `ledger_entries`: **no client writes, ever.** All money moves through server-side functions
  (Postgres functions / Next.js route handlers with the service role key).

## Analytics

Admin time-bucket charts (15m → 1y) are plain SQL with `date_trunc`/`time_bucket`-style grouping
over `ledger_entries` and `orders` — no separate analytics infrastructure at this scale. Add
matching indexes: `ledger_entries(created_at)`, `orders(created_at)`, `sub_orders(store_id, status)`,
`order_payments(gateway_ref)`.
