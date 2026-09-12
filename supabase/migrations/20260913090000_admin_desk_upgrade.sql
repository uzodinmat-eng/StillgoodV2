-- Admin desk analytics upgrade: per-item decision timing + admin/store messaging.
-- Applies automatically via the app-startup migration runner in src/lib/db/client.ts.

alter table public.order_items
  add column if not exists decided_at timestamptz;

-- Rewrite of decide_store_order_item (copied from 20260908090000_store_wallet_workflow.sql)
-- with decided_at = now() stamped on every available/unavailable decision.
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
    update public.order_items set fulfillment_status = 'available', refunded_at = null, decided_at = now() where id = v_item.id;
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
    update public.order_items set fulfillment_status = 'unavailable', refunded_at = now(), decided_at = now() where id = v_item.id;
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

-- Admin <-> store message thread (polled via server actions; no Realtime dependency).
create table if not exists public.store_messages (
  id text primary key,
  store_id text not null references public.stores (id) on delete cascade,
  sender_role text not null check (sender_role in ('admin', 'store')),
  sender_customer_id text,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists store_messages_store_created_idx
  on public.store_messages (store_id, created_at);
