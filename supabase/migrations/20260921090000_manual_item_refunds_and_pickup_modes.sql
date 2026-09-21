-- Manual item refunds, verified customer bank details, and explicit pickup destination.
alter table public.customers
  add column if not exists bank_code text,
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_account_name text,
  add column if not exists bank_resolved_account_name text,
  add column if not exists bank_verified boolean not null default false;

alter table public.orders
  add column if not exists pickup_mode text not null default 'store' check (pickup_mode in ('store','hub')),
  add column if not exists pickup_destination_name text not null default '',
  add column if not exists pickup_destination_address text not null default '';

create table if not exists public.manual_item_refunds (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  order_item_id text not null references public.order_items(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete cascade,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  amount integer not null check (amount > 0),
  bank_code text not null,
  bank_name text not null,
  account_number text not null check (char_length(account_number) = 10),
  account_name text not null,
  resolved_account_name text not null,
  status text not null default 'pending' check (status in ('pending','sent','rejected')),
  unavailable_at timestamptz not null,
  pickup_finalized_at timestamptz not null,
  sent_at timestamptz,
  sent_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_item_id)
);
create index if not exists manual_item_refunds_status_idx on public.manual_item_refunds(status);
create index if not exists manual_item_refunds_order_idx on public.manual_item_refunds(order_id);

-- Store decisions no longer credit customer wallets. Store holds remain reversible.
create or replace function public.decide_store_order_item(
  p_order_id text, p_store_id text, p_product_id text, p_available boolean
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_item public.order_items%rowtype;
  v_amount integer;
  v_old text;
  v_new text := case when p_available then 'available' else 'unavailable' end;
begin
  select * into v_item from public.order_items
    where order_id = p_order_id and store_id = p_store_id and product_id = p_product_id for update;
  if not found then raise exception 'Order item not found for this store'; end if;
  if v_item.fulfillment_status = 'picked_up' then raise exception 'Picked-up items cannot be changed'; end if;
  if exists (select 1 from public.store_fulfillments sf
             where sf.order_id = p_order_id and sf.store_id = p_store_id
               and sf.status = 'picked_up') then
    raise exception 'This order has been picked up and is locked';
  end if;

  v_old := v_item.fulfillment_status;
  if v_old = v_new then return; end if;
  v_amount := v_item.price * v_item.quantity;
  update public.order_items set fulfillment_status = v_new, refunded_at = null, decided_at = now() where id = v_item.id;

  if v_new = 'available' and v_old <> 'unavailable' then
    insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
      values ('txn_confirmed_' || v_item.id, 'wallet_store_pending_' || p_store_id, v_amount, 'confirmed_hold', 'order_item', v_item.id, 'Store confirmed item available'),
             ('txn_confirmed_' || v_item.id, 'wallet_platform', -v_amount, 'confirmed_hold', 'order_item', v_item.id, 'Store confirmed item available')
      on conflict (txn_id, wallet_id, kind) do nothing;
  elsif v_new = 'available' and v_old = 'unavailable' then
    insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
      values ('txn_reversal_refund_' || v_item.id, 'wallet_store_pending_' || p_store_id, v_amount, 'item_refund_reversal', 'order_item', v_item.id, 'Item restored as available'),
             ('txn_reversal_refund_' || v_item.id, 'wallet_platform', -v_amount, 'item_refund_reversal', 'order_item', v_item.id, 'Item restored as available')
      on conflict (txn_id, wallet_id, kind) do nothing;
  elsif v_new = 'unavailable' and v_old = 'available' then
    insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
      values ('txn_revoke_hold_' || v_item.id, 'wallet_store_pending_' || p_store_id, -v_amount, 'confirmed_hold_reversal', 'order_item', v_item.id, 'Confirmed item later marked unavailable'),
             ('txn_revoke_hold_' || v_item.id, 'wallet_platform', v_amount, 'confirmed_hold_reversal', 'order_item', v_item.id, 'Confirmed item later marked unavailable')
      on conflict (txn_id, wallet_id, kind) do nothing;
  end if;

  if exists (select 1 from public.order_items oi
             where oi.order_id = p_order_id and oi.store_id = p_store_id
               and oi.fulfillment_status = 'available')
     and not exists (select 1 from public.orders o where o.id = p_order_id and o.status = 'cancelled') then
    update public.store_fulfillments sf set status = 'ready_for_pickup', confirmed_at = now(), updated_at = now()
     where sf.order_id = p_order_id and sf.store_id = p_store_id
       and not exists (select 1 from public.order_items x where x.order_id = p_order_id and x.store_id = p_store_id and x.fulfillment_status = 'pending');
    update public.orders set status = case when not exists (select 1 from public.order_items x where x.order_id = p_order_id and x.fulfillment_status = 'pending') then 'confirmed' else 'awaiting_store_confirmation' end, updated_at = now()
     where id = p_order_id and status in ('paid','awaiting_store_confirmation','confirmed');
  else
    update public.store_fulfillments set status = 'cancelled', updated_at = now()
     where order_id = p_order_id and store_id = p_store_id and status <> 'picked_up';
    update public.orders set status = 'cancelled', updated_at = now()
     where id = p_order_id and status in ('paid','awaiting_store_confirmation','confirmed');
  end if;
end; $$;

-- Pickup releases only available items and queues unavailable items for admin.
create or replace function public.complete_store_pickup(
  p_order_id text, p_store_id text, p_pickup_code text
) returns table (order_id text, picked_up_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_fulfillment public.store_fulfillments%rowtype;
  v_picked_at timestamptz := now();
  v_total integer;
  v_customer_id text;
  v_item record;
begin
  select * into v_fulfillment from public.store_fulfillments where store_fulfillments.order_id = p_order_id and store_fulfillments.store_id = p_store_id for update;
  if not found then raise exception 'Order not found for this store'; end if;
  if v_fulfillment.status <> 'ready_for_pickup' then raise exception 'Store must confirm item availability before pickup'; end if;
  if v_fulfillment.pickup_code <> trim(p_pickup_code) then raise exception 'Invalid pickup code'; end if;
  select customer_id into v_customer_id from public.orders where id = p_order_id;
  select coalesce(sum(oi.price * oi.quantity), 0) into v_total from public.order_items oi where oi.order_id = p_order_id and oi.store_id = p_store_id and oi.fulfillment_status = 'available';
  for v_item in select oi.id, oi.product_id, oi.product_name, oi.quantity, oi.price, oi.fulfillment_status, oi.decided_at from public.order_items oi where oi.order_id = p_order_id and oi.store_id = p_store_id loop
    if v_item.fulfillment_status = 'available' then
      update public.products set stock_quantity = stock_quantity - v_item.quantity, updated_at = v_picked_at where id = v_item.product_id and store_id = p_store_id and stock_quantity >= v_item.quantity;
      if not found then raise exception 'Insufficient stock for pickup item'; end if;
      update public.order_items set fulfillment_status = 'picked_up' where id = v_item.id;
    elsif v_item.fulfillment_status = 'unavailable' then
      insert into public.manual_item_refunds (id, order_id, order_item_id, customer_id, product_name, quantity, amount, bank_code, bank_name, account_number, account_name, resolved_account_name, unavailable_at, pickup_finalized_at)
      select 'mir_' || v_item.id, p_order_id, v_item.id, c.id, v_item.product_name, v_item.quantity, v_item.price * v_item.quantity, c.bank_code, c.bank_name, c.bank_account_number, c.bank_account_name, c.bank_resolved_account_name, coalesce(v_item.decided_at, v_picked_at), v_picked_at
      from public.customers c where c.id = v_customer_id and c.bank_verified = true
      on conflict (order_item_id) do nothing;
    end if;
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
