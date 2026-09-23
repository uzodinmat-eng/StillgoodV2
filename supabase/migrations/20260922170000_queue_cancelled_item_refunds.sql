-- A store that marks every item unavailable cancels the order, so no pickup PIN
-- is ever entered. Queue those refunds at cancellation. Pickup still queues the
-- partial-unavailable case. Restoring an item drops a still-pending refund.

create or replace function public.decide_store_order_item(
  p_order_id text, p_store_id text, p_product_id text, p_available boolean
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_item public.order_items%rowtype;
  v_amount integer;
  v_old text;
  v_new text := case when p_available then 'available' else 'unavailable' end;
  v_finalized timestamptz := now();
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
  update public.order_items set fulfillment_status = v_new, refunded_at = null, decided_at = v_finalized where id = v_item.id;

  if v_new = 'available' then
    delete from public.manual_item_refunds
     where order_item_id = v_item.id and status = 'pending';
  end if;

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
    update public.store_fulfillments sf set status = 'ready_for_pickup', confirmed_at = v_finalized, updated_at = v_finalized
     where sf.order_id = p_order_id and sf.store_id = p_store_id
       and not exists (select 1 from public.order_items x where x.order_id = p_order_id and x.store_id = p_store_id and x.fulfillment_status = 'pending');
    update public.orders set status = case when not exists (select 1 from public.order_items x where x.order_id = p_order_id and x.fulfillment_status = 'pending') then 'confirmed' else 'awaiting_store_confirmation' end, updated_at = v_finalized
     where id = p_order_id and status in ('paid','awaiting_store_confirmation','confirmed');
  else
    update public.store_fulfillments set status = 'cancelled', updated_at = v_finalized
     where order_id = p_order_id and store_id = p_store_id and status <> 'picked_up';
    update public.orders set status = 'cancelled', updated_at = v_finalized
     where id = p_order_id and status in ('paid','awaiting_store_confirmation','confirmed');

    insert into public.manual_item_refunds (
      id, order_id, order_item_id, customer_id, product_name, quantity, amount,
      bank_code, bank_name, account_number, account_name, resolved_account_name,
      unavailable_at, pickup_finalized_at
    )
    select
      'mir_' || oi.id, oi.order_id, oi.id, c.id, oi.product_name, oi.quantity, oi.price * oi.quantity,
      c.bank_code, c.bank_name, c.bank_account_number, c.bank_account_name, c.bank_resolved_account_name,
      coalesce(oi.decided_at, v_finalized), v_finalized
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.customers c on c.id = o.customer_id
    where oi.order_id = p_order_id
      and oi.store_id = p_store_id
      and oi.fulfillment_status = 'unavailable'
      and c.bank_verified = true
      and c.bank_code is not null
      and c.bank_name is not null
      and c.bank_account_name is not null
      and c.bank_resolved_account_name is not null
      and char_length(c.bank_account_number) = 10
    on conflict (order_item_id) do nothing;
  end if;
end; $$;

-- Orders already cancelled or picked up before this queue existed.
insert into public.manual_item_refunds (
  id, order_id, order_item_id, customer_id, product_name, quantity, amount,
  bank_code, bank_name, account_number, account_name, resolved_account_name,
  unavailable_at, pickup_finalized_at
)
select
  'mir_' || oi.id, oi.order_id, oi.id, c.id, oi.product_name, oi.quantity, oi.price * oi.quantity,
  c.bank_code, c.bank_name, c.bank_account_number, c.bank_account_name, c.bank_resolved_account_name,
  coalesce(oi.decided_at, o.updated_at, now()),
  coalesce(o.picked_up_at, oi.decided_at, o.updated_at, now())
from public.order_items oi
join public.orders o on o.id = oi.order_id
join public.customers c on c.id = o.customer_id
where oi.fulfillment_status = 'unavailable'
  and o.status in ('cancelled', 'picked_up')
  and c.bank_verified = true
  and c.bank_code is not null
  and c.bank_name is not null
  and c.bank_account_name is not null
  and c.bank_resolved_account_name is not null
  and char_length(c.bank_account_number) = 10
on conflict (order_item_id) do nothing;
