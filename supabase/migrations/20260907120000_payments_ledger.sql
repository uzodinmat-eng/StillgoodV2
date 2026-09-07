-- Paystack payment records and append-only double-entry ledger for the prototype order model.
create table if not exists public.order_payments (
  id text primary key,
  order_id text not null references public.orders (id) on delete cascade,
  kind text not null default 'initial' check (kind in ('initial', 'top_up')),
  amount integer not null check (amount >= 0),
  wallet_applied integer not null default 0 check (wallet_applied >= 0),
  picking_surcharge_delta integer not null default 0,
  gateway text not null default 'paystack',
  gateway_ref text unique,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists order_payments_order_id_idx on public.order_payments (order_id);
create index if not exists order_payments_status_idx on public.order_payments (status);

create table if not exists public.wallets (
  id text primary key,
  owner_type text not null check (owner_type in ('customer', 'store', 'platform', 'gateway')),
  owner_id text,
  unique (owner_type, owner_id)
);

create table if not exists public.ledger_entries (
  id bigint generated always as identity primary key,
  txn_id text not null,
  wallet_id text not null references public.wallets (id),
  amount integer not null,
  kind text not null,
  ref_type text,
  ref_id text,
  note text,
  created_at timestamptz not null default now(),
  unique (txn_id, wallet_id, kind)
);
create index if not exists ledger_entries_wallet_id_idx on public.ledger_entries (wallet_id);
create index if not exists ledger_entries_ref_idx on public.ledger_entries (ref_type, ref_id);

insert into public.wallets (id, owner_type, owner_id)
select 'wallet_platform', 'platform', null
where not exists (select 1 from public.wallets where id = 'wallet_platform');

insert into public.wallets (id, owner_type, owner_id)
select 'wallet_gateway_paystack', 'gateway', 'paystack'
where not exists (select 1 from public.wallets where id = 'wallet_gateway_paystack');
