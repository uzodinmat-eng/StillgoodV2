-- Three-sided fulfillment: payment, store decisions, customer refunds, and payout release.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'pending_payment', 'paid', 'awaiting_store_confirmation', 'confirmed',
  'partially_fulfilled', 'ready_for_pickup', 'picked_up', 'cancelled', 'refunded'
));

alter table public.order_items
  add column if not exists fulfillment_status text not null default 'pending'
    check (fulfillment_status in ('pending', 'available', 'unavailable', 'picked_up')),
  add column if not exists refunded_at timestamptz;

alter table public.store_fulfillments
  add column if not exists confirmed_at timestamptz,
  add column if not exists payout_released_at timestamptz;

insert into public.wallets (id, owner_type, owner_id)
select 'wallet_customer_' || id, 'customer', id
from public.customers
where not exists (
  select 1 from public.wallets w
  where w.owner_type = 'customer' and w.owner_id = public.customers.id
);


-- Pickup can only consume inventory the store confirmed as available.
create or replace function public.complete_store_pickup(
  p_order_id text, p_store_id text, p_pickup_code text
) returns table (order_id text, picked_up_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_fulfillment public.store_fulfillments%rowtype;
  v_picked_at timestamptz := now();
  v_item record;
begin
  select * into v_fulfillment from public.store_fulfillments
   where store_fulfillments.order_id = p_order_id and store_fulfillments.store_id = p_store_id for update;
  if not found then raise exception 'Order not found for this store'; end if;
  if v_fulfillment.status <> 'ready_for_pickup' then raise exception 'Store must confirm item availability before pickup'; end if;
  if v_fulfillment.pickup_code <> trim(p_pickup_code) then raise exception 'Invalid pickup code'; end if;
  for v_item in select oi.product_id, oi.quantity from public.order_items oi
    where oi.order_id = p_order_id and oi.store_id = p_store_id and oi.fulfillment_status = 'available'
  loop
    update public.products set stock_quantity = stock_quantity - v_item.quantity, updated_at = v_picked_at
     where id = v_item.product_id and store_id = p_store_id and stock_quantity >= v_item.quantity;
    if not found then raise exception 'Insufficient stock for pickup item'; end if;
    update public.order_items set fulfillment_status = 'picked_up' where order_items.order_id = p_order_id and order_items.product_id = v_item.product_id;
  end loop;
  insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
    values ('txn_payout_release_' || p_order_id || '_' || p_store_id, 'wallet_store_pending_' || p_store_id, -(select subtotal from public.store_fulfillments where id = v_fulfillment.id), 'payout_release', 'order', p_order_id, 'Verified pickup released store payout'),
           ('txn_payout_release_' || p_order_id || '_' || p_store_id, 'wallet_store_available_' || p_store_id, (select subtotal from public.store_fulfillments where id = v_fulfillment.id), 'payout_release', 'order', p_order_id, 'Verified pickup released store payout')
    on conflict (txn_id, wallet_id, kind) do nothing;
  update public.store_fulfillments set status = 'picked_up', picked_up_at = v_picked_at, payout_released_at = v_picked_at, updated_at = v_picked_at where id = v_fulfillment.id;
  if not exists (select 1 from public.store_fulfillments sf where sf.order_id = p_order_id and sf.status <> 'picked_up') then
    update public.orders set status = 'picked_up', picked_up_at = v_picked_at, updated_at = v_picked_at where id = p_order_id;
  end if;
  return query select p_order_id, v_picked_at;
end;
$$;
revoke all on function public.complete_store_pickup(text, text, text) from public;
