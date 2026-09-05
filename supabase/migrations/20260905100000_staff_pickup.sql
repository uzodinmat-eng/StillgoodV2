-- Staff pickup verification and stock decrement.
-- Additive only: the function is called by the server-side store portal.

create or replace function public.complete_store_pickup(
  p_order_id text,
  p_store_id text,
  p_pickup_code text
)
returns table (order_id text, picked_up_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_picked_at timestamptz := now();
  v_item record;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
    and store_id = p_store_id
  for update;

  if not found then
    raise exception 'Order not found for this store';
  end if;

  if v_order.status <> 'confirmed' and v_order.status <> 'ready_for_pickup' then
    raise exception 'Order is not available for pickup';
  end if;

  if v_order.pickup_verification_code <> trim(p_pickup_code) then
    raise exception 'Invalid pickup code';
  end if;

  if exists (
    select 1
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.store_id <> p_store_id
  ) then
    raise exception 'Multi-store orders require store-level fulfillment';
  end if;

  for v_item in
    select oi.product_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.store_id = p_store_id
  loop
    update public.products
    set stock_quantity = stock_quantity - v_item.quantity,
        updated_at = v_picked_at
    where id = v_item.product_id
      and store_id = p_store_id
      and stock_quantity >= v_item.quantity;

    if not found then
      raise exception 'Insufficient stock for pickup item';
    end if;
  end loop;

  update public.orders
  set status = 'picked_up', picked_up_at = v_picked_at, updated_at = v_picked_at
  where id = p_order_id;

  return query select p_order_id, v_picked_at;
end;
$$;

revoke all on function public.complete_store_pickup(text, text, text) from public;
