-- Wallet refund (bank payout) requests paid via Paystack transfer (net = amount - ₦100 fee).
-- Applies automatically via the app-startup migration runner in src/lib/db/client.ts
-- (it scans this directory), mirroring the reserve/reverse pattern from
-- 20260908090000_store_wallet_workflow.sql.

create table if not exists public.wallet_refund_requests (
  id text primary key,
  customer_id text not null references public.customers (id) on delete cascade,
  amount integer not null check (amount > 100),
  fee integer not null default 100,
  net_amount integer not null check (net_amount > 0),
  bank_code text not null,
  bank_name text not null,
  account_number text not null check (char_length(account_number) = 10),
  account_name text not null,
  resolved_account_name text,
  name_match boolean,
  status text not null default 'pending'
    check (status in ('pending', 'fulfilled', 'failed', 'rejected')),
  paystack_recipient_code text,
  paystack_transfer_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists wallet_refund_requests_customer_idx
  on public.wallet_refund_requests (customer_id);
create index if not exists wallet_refund_requests_status_idx
  on public.wallet_refund_requests (status);
create index if not exists wallet_refund_requests_created_idx
  on public.wallet_refund_requests (created_at desc);

-- Atomically reserve a payout: balance-check + wallet debit + ledger legs in one
-- transaction. No status change here; the caller marks fulfilled/failed afterwards.
-- Mirrors public.reserve_store_withdrawal.
create or replace function public.reserve_wallet_refund(p_refund_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.wallet_refund_requests%rowtype;
  v_balance integer;
begin
  select * into v from public.wallet_refund_requests where id = p_refund_id for update;
  if not found then raise exception 'Refund request not found'; end if;
  if v.status <> 'pending' then raise exception 'Refund request is no longer pending'; end if;
  select wallet_balance into v_balance from public.customers where id = v.customer_id for update;
  if not found then raise exception 'Customer not found'; end if;
  if v.amount <= 0 or v.amount > v_balance then raise exception 'Refund exceeds wallet balance'; end if;
  update public.customers set wallet_balance = wallet_balance - v.amount, updated_at = now() where id = v.customer_id;
  insert into public.wallets (id, owner_type, owner_id)
    values ('wallet_customer_' || v.customer_id, 'customer', v.customer_id)
    on conflict (id) do nothing;
  insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
    values ('txn_wallet_payout_' || p_refund_id, 'wallet_customer_' || v.customer_id, -v.amount, 'wallet_payout', 'wallet_refund', p_refund_id, 'Wallet bank payout reserved'),
           ('txn_wallet_payout_' || p_refund_id, 'wallet_platform', v.amount, 'wallet_payout', 'wallet_refund', p_refund_id, 'Wallet bank payout reserved')
    on conflict (txn_id, wallet_id, kind) do nothing;
  update public.wallet_refund_requests set updated_at = now() where id = p_refund_id;
end; $$;

-- Restore a reserved payout after a failed Paystack transfer.
-- Mirrors public.reverse_store_withdrawal.
create or replace function public.reverse_wallet_refund(p_refund_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.wallet_refund_requests%rowtype;
begin
  select * into v from public.wallet_refund_requests where id = p_refund_id for update;
  if not found or v.status <> 'pending' then return; end if;
  update public.customers set wallet_balance = wallet_balance + v.amount, updated_at = now() where id = v.customer_id;
  insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
    values ('txn_wallet_payout_reversal_' || p_refund_id, 'wallet_customer_' || v.customer_id, v.amount, 'wallet_payout_reversal', 'wallet_refund', p_refund_id, 'Failed wallet payout restored'),
           ('txn_wallet_payout_reversal_' || p_refund_id, 'wallet_platform', -v.amount, 'wallet_payout_reversal', 'wallet_refund', p_refund_id, 'Failed wallet payout restored')
    on conflict (txn_id, wallet_id, kind) do nothing;
  update public.wallet_refund_requests set status = 'failed', decided_at = now(), updated_at = now() where id = p_refund_id;
end; $$;

-- Mark a reserved payout fulfilled after a successful Paystack transfer.
create or replace function public.complete_wallet_refund(p_refund_id text, p_transfer_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.wallet_refund_requests
    set status = 'fulfilled', paystack_transfer_code = p_transfer_code, decided_at = now(), updated_at = now()
    where id = p_refund_id and status = 'pending';
  if not found then raise exception 'Refund request is no longer pending'; end if;
end; $$;

-- Single-transaction payout for the transfer-first flow: balance-check, wallet
-- debit, ledger legs, and fulfilled status all happen while holding the row
-- lock, so two concurrent payouts of the same request cannot double-debit.
create or replace function public.fulfill_wallet_refund(p_refund_id text, p_recipient_code text, p_transfer_code text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.wallet_refund_requests%rowtype;
  v_balance integer;
begin
  select * into v from public.wallet_refund_requests where id = p_refund_id for update;
  if not found then raise exception 'Refund request not found'; end if;
  if v.status <> 'pending' then raise exception 'Refund request is no longer pending'; end if;
  select wallet_balance into v_balance from public.customers where id = v.customer_id for update;
  if not found then raise exception 'Customer not found'; end if;
  if v.amount <= 0 or v.amount > v_balance then raise exception 'Refund exceeds wallet balance'; end if;
  update public.customers set wallet_balance = wallet_balance - v.amount, updated_at = now() where id = v.customer_id;
  insert into public.wallets (id, owner_type, owner_id)
    values ('wallet_customer_' || v.customer_id, 'customer', v.customer_id)
    on conflict (id) do nothing;
  insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
    values ('txn_wallet_payout_' || p_refund_id, 'wallet_customer_' || v.customer_id, -v.amount, 'wallet_payout', 'wallet_refund', p_refund_id, 'Wallet bank payout'),
           ('txn_wallet_payout_' || p_refund_id, 'wallet_platform', v.amount, 'wallet_payout', 'wallet_refund', p_refund_id, 'Wallet bank payout')
    on conflict (txn_id, wallet_id, kind) do nothing;
  update public.wallet_refund_requests
    set status = 'fulfilled', paystack_recipient_code = p_recipient_code, paystack_transfer_code = p_transfer_code, decided_at = now(), updated_at = now()
    where id = p_refund_id;
end; $$;
