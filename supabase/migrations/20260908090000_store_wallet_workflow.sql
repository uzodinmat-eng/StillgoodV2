-- Store wallet lifecycle: confirmed funds are reversible until pickup; available funds settle at pickup.
alter table public.stores
  add column if not exists paystack_recipient_code text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_name text,
  add column if not exists payout_account_number text;

insert into public.wallets (id, owner_type, owner_id)
select 'wallet_store_pending_' || id, 'store', id || ':pending'
from public.stores
where not exists (select 1 from public.wallets w where w.id = 'wallet_store_pending_' || public.stores.id);
insert into public.wallets (id, owner_type, owner_id)
select 'wallet_store_available_' || id, 'store', id || ':available'
from public.stores
where not exists (select 1 from public.wallets w where w.id = 'wallet_store_available_' || public.stores.id);

-- A confirmed item is a hold, not a final payout. Reversal entries restore the hold.
create table if not exists public.store_withdrawals (
  id text primary key,
  store_id text not null references public.stores(id),
  amount integer not null check (amount > 0),
  recipient_code text not null,
  transfer_code text,
  status text not null default 'pending' check (status in ('pending','success','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.decide_store_order_item(
  p_order_id text, p_store_id text, p_product_id text, p_available boolean
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_item public.order_items%rowtype;
  v_customer_id text;
  v_amount integer;
  v_old text;
  v_new text := case when p_available then 'available' else 'unavailable' end;
begin
  select * into v_item from public.order_items where order_id = p_order_id and store_id = p_store_id and product_id = p_product_id for update;
  if not found then raise exception 'Order item not found for this store'; end if;
  if v_item.fulfillment_status = 'picked_up' then raise exception 'Picked-up items cannot be changed'; end if;
  v_old := v_item.fulfillment_status;
  if v_old = v_new then return; end if;
  select customer_id into v_customer_id from public.orders where id = p_order_id for update;
  v_amount := v_item.price * v_item.quantity;

  if v_new = 'available' then
    update public.order_items set fulfillment_status = 'available', refunded_at = null where id = v_item.id;
    if v_old = 'unavailable' then
      if not exists (select 1 from public.customers where id = v_customer_id and wallet_balance >= v_amount) then raise exception 'Customer wallet balance has already been spent'; end if;
      update public.customers set wallet_balance = wallet_balance - v_amount, updated_at = now() where id = v_customer_id;
      insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
       values ('txn_reversal_refund_' || v_item.id, 'wallet_customer_' || v_customer_id, -v_amount, 'item_refund_reversal', 'order_item', v_item.id, 'Item restored as available'),
              ('txn_reversal_refund_' || v_item.id, 'wallet_store_pending_' || p_store_id, v_amount, 'item_refund_reversal', 'order_item', v_item.id, 'Item restored as available')
       on conflict (txn_id, wallet_id, kind) do nothing;
    else
      insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
       values ('txn_confirmed_' || v_item.id, 'wallet_store_pending_' || p_store_id, v_amount, 'confirmed_hold', 'order_item', v_item.id, 'Store confirmed item available'),
              ('txn_confirmed_' || v_item.id, 'wallet_platform', -v_amount, 'confirmed_hold', 'order_item', v_item.id, 'Store confirmed item available')
       on conflict (txn_id, wallet_id, kind) do nothing;
    end if;
  else
    update public.order_items set fulfillment_status = 'unavailable', refunded_at = now() where id = v_item.id;
    insert into public.wallets (id, owner_type, owner_id) values ('wallet_customer_' || v_customer_id, 'customer', v_customer_id) on conflict (id) do nothing;
    update public.customers set wallet_balance = wallet_balance + v_amount, updated_at = now() where id = v_customer_id;
    if v_old = 'available' then
      insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
       values ('txn_revoke_hold_' || v_item.id, 'wallet_store_pending_' || p_store_id, -v_amount, 'confirmed_hold_reversal', 'order_item', v_item.id, 'Confirmed item later marked unavailable'),
              ('txn_revoke_hold_' || v_item.id, 'wallet_platform', v_amount, 'confirmed_hold_reversal', 'order_item', v_item.id, 'Confirmed item later marked unavailable')
       on conflict (txn_id, wallet_id, kind) do nothing;
    end if;
    insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
      values ('txn_refund_' || v_item.id, 'wallet_customer_' || v_customer_id, v_amount, 'item_refund', 'order_item', v_item.id, 'Unavailable item refund'),
             ('txn_refund_' || v_item.id, 'wallet_platform', -v_amount, 'item_refund', 'order_item', v_item.id, 'Unavailable item refund')
      on conflict (txn_id, wallet_id, kind) do nothing;
  end if;

  update public.store_fulfillments sf set status = 'ready_for_pickup', confirmed_at = now(), updated_at = now()
   where sf.order_id = p_order_id and sf.store_id = p_store_id
   and not exists (select 1 from public.order_items x where x.order_id = p_order_id and x.store_id = p_store_id and x.fulfillment_status = 'pending');
  update public.orders set status = case when not exists (select 1 from public.order_items x where x.order_id = p_order_id and x.fulfillment_status = 'pending') then 'confirmed' else 'awaiting_store_confirmation' end, updated_at = now() where id = p_order_id and status in ('paid','awaiting_store_confirmation','confirmed');
end; $$;


create or replace function public.reserve_store_withdrawal(p_store_id text, p_amount integer, p_withdrawal_id text, p_recipient_code text)
returns void language plpgsql security definer set search_path = public as $$
declare v_available integer;
begin
  select coalesce(sum(amount), 0) into v_available from public.ledger_entries where wallet_id = 'wallet_store_available_' || p_store_id;
  if p_amount <= 0 or p_amount > v_available then raise exception 'Withdrawal exceeds available balance'; end if;
  insert into public.store_withdrawals (id, store_id, amount, recipient_code) values (p_withdrawal_id, p_store_id, p_amount, p_recipient_code);
  insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
    values ('txn_withdrawal_' || p_withdrawal_id, 'wallet_store_available_' || p_store_id, -p_amount, 'withdrawal', 'store_withdrawal', p_withdrawal_id, 'Paystack withdrawal reserved'),
           ('txn_withdrawal_' || p_withdrawal_id, 'wallet_platform', p_amount, 'withdrawal', 'store_withdrawal', p_withdrawal_id, 'Paystack withdrawal reserved');
end; $$;

create or replace function public.reverse_store_withdrawal(p_withdrawal_id text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.store_withdrawals%rowtype;
begin
  select * into v from public.store_withdrawals where id = p_withdrawal_id for update;
  if not found or v.status <> 'pending' then return; end if;
  insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
    values ('txn_withdrawal_reversal_' || p_withdrawal_id, 'wallet_store_available_' || v.store_id, v.amount, 'withdrawal_reversal', 'store_withdrawal', p_withdrawal_id, 'Failed Paystack withdrawal restored'),
           ('txn_withdrawal_reversal_' || p_withdrawal_id, 'wallet_platform', -v.amount, 'withdrawal_reversal', 'store_withdrawal', p_withdrawal_id, 'Failed Paystack withdrawal restored')
    on conflict (txn_id, wallet_id, kind) do nothing;
  update public.store_withdrawals set status = 'failed', updated_at = now() where id = p_withdrawal_id;
end; $$;


-- Replace the legacy pickup function so only available items settle and pay out.
create or replace function public.complete_store_pickup(
  p_order_id text, p_store_id text, p_pickup_code text
) returns table (order_id text, picked_up_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_fulfillment public.store_fulfillments%rowtype;
  v_picked_at timestamptz := now();
  v_total integer;
  v_item record;
begin
  select * into v_fulfillment from public.store_fulfillments where store_fulfillments.order_id = p_order_id and store_fulfillments.store_id = p_store_id for update;
  if not found then raise exception 'Order not found for this store'; end if;
  if v_fulfillment.status <> 'ready_for_pickup' then raise exception 'Store must confirm item availability before pickup'; end if;
  if v_fulfillment.pickup_code <> trim(p_pickup_code) then raise exception 'Invalid pickup code'; end if;
  select coalesce(sum(oi.price * oi.quantity), 0) into v_total from public.order_items oi where oi.order_id = p_order_id and oi.store_id = p_store_id and oi.fulfillment_status = 'available';
  for v_item in select oi.product_id, oi.quantity from public.order_items oi where oi.order_id = p_order_id and oi.store_id = p_store_id and oi.fulfillment_status = 'available' loop
    update public.products set stock_quantity = stock_quantity - v_item.quantity, updated_at = v_picked_at where id = v_item.product_id and store_id = p_store_id and stock_quantity >= v_item.quantity;
    if not found then raise exception 'Insufficient stock for pickup item'; end if;
    update public.order_items set fulfillment_status = 'picked_up' where order_items.order_id = p_order_id and order_items.product_id = v_item.product_id;
  end loop;
  insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
    values ('txn_payout_release_' || p_order_id || '_' || p_store_id, 'wallet_store_pending_' || p_store_id, -v_total, 'payout_release', 'order', p_order_id, 'Verified pickup released store payout'),
           ('txn_payout_release_' || p_order_id || '_' || p_store_id, 'wallet_store_available_' || p_store_id, v_total, 'payout_release', 'order', p_order_id, 'Verified pickup released store payout')
    on conflict (txn_id, wallet_id, kind) do nothing;
  update public.store_fulfillments set status = 'picked_up', picked_up_at = v_picked_at, payout_released_at = v_picked_at, updated_at = v_picked_at where id = v_fulfillment.id;
  if not exists (select 1 from public.store_fulfillments sf where sf.order_id = p_order_id and sf.status <> 'picked_up') then update public.orders set status = 'picked_up', picked_up_at = v_picked_at, updated_at = v_picked_at where id = p_order_id; end if;
  return query select p_order_id, v_picked_at;
end; $$;
revoke all on function public.complete_store_pickup(text, text, text) from public;
