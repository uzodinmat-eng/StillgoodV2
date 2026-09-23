-- A store can mark an item available, unavailable, then available again.
-- Ledger ids used to be one per item, so the second reversal was skipped and
-- the confirmed balance kept the restored hold after pickup.

create or replace function public.decide_store_order_item(
  p_order_id text, p_store_id text, p_product_id text, p_available boolean
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_item public.order_items%rowtype;
  v_amount integer;
  v_old text;
  v_new text := case when p_available then 'available' else 'unavailable' end;
  v_finalized timestamptz := now();
  v_hold integer := 0;
  v_target integer;
  v_delta integer;
  v_kind text;
  v_txn text;
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

  select coalesce(sum(amount), 0)::integer into v_hold
    from public.ledger_entries
   where wallet_id = 'wallet_store_pending_' || p_store_id
     and ref_id = v_item.id
     and ref_type = 'order_item'
     and kind in ('confirmed_hold', 'item_refund_reversal', 'confirmed_hold_reversal');

  v_target := case when v_new = 'available' then v_amount else 0 end;
  v_delta := v_target - v_hold;
  if v_delta <> 0 then
    v_kind := case
      when v_new = 'unavailable' then 'confirmed_hold_reversal'
      when v_old = 'unavailable' then 'item_refund_reversal'
      else 'confirmed_hold'
    end;
    v_txn := 'txn_hold_' || v_item.id || '_' || (floor(extract(epoch from clock_timestamp()) * 1000))::bigint::text;
    insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
      values (
        v_txn,
        'wallet_store_pending_' || p_store_id,
        v_delta,
        v_kind,
        'order_item',
        v_item.id,
        case when v_new = 'available' then 'Store confirmed item available' else 'Confirmed item later marked unavailable' end
      ),
      (
        v_txn,
        'wallet_platform',
        -v_delta,
        v_kind,
        'order_item',
        v_item.id,
        case when v_new = 'available' then 'Store confirmed item available' else 'Confirmed item later marked unavailable' end
      )
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

insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
select
  'txn_clear_unavailable_hold_' || oi.id,
  'wallet_store_pending_' || oi.store_id,
  (-sum(le.amount))::integer,
  'confirmed_hold_reversal',
  'order_item',
  oi.id,
  'Clear confirmed hold left on an unavailable item after a repeated decision'
from public.order_items oi
join public.ledger_entries le
  on le.ref_id = oi.id
 and le.ref_type = 'order_item'
 and le.wallet_id = 'wallet_store_pending_' || oi.store_id
 and le.kind in ('confirmed_hold', 'item_refund_reversal', 'confirmed_hold_reversal')
where oi.fulfillment_status = 'unavailable'
group by oi.id, oi.store_id
having sum(le.amount) > 0
on conflict (txn_id, wallet_id, kind) do nothing;
