-- Per-store fulfillment for multi-store orders.
-- Additive only; preserves existing orders and order_items.

create table if not exists public.store_fulfillments (
  id text primary key,
  order_id text not null references public.orders (id) on delete cascade,
  store_id text not null references public.stores (id),
  subtotal integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'ready_for_pickup', 'picked_up', 'cancelled')),
  pickup_code text not null,
  picked_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, store_id)
);

create index if not exists store_fulfillments_order_id_idx on public.store_fulfillments (order_id);
create index if not exists store_fulfillments_store_status_idx on public.store_fulfillments (store_id, status);

insert into public.store_fulfillments (id, order_id, store_id, subtotal, status, pickup_code, picked_up_at)
select
  'ful_' || o.id || '_' || oi.store_id,
  o.id,
  oi.store_id,
  coalesce(sum(oi.price * oi.quantity), 0),
  case when o.status = 'picked_up' then 'picked_up' else 'pending' end,
  o.pickup_verification_code,
  o.picked_up_at
from public.orders o
join public.order_items oi on oi.order_id = o.id
group by o.id, oi.store_id, o.status, o.pickup_verification_code, o.picked_up_at
on conflict (order_id, store_id) do nothing;

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
  v_fulfillment public.store_fulfillments%rowtype;
  v_picked_at timestamptz := now();
  v_item record;
begin
  select * into v_fulfillment
  from public.store_fulfillments
  where store_fulfillments.order_id = p_order_id
    and store_fulfillments.store_id = p_store_id
  for update;

  if not found then raise exception 'Order not found for this store'; end if;
  if v_fulfillment.status <> 'pending' and v_fulfillment.status <> 'ready_for_pickup' then
    raise exception 'Store fulfillment is not available for pickup';
  end if;
  if v_fulfillment.pickup_code <> trim(p_pickup_code) then raise exception 'Invalid pickup code'; end if;

  for v_item in
    select oi.product_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.store_id = p_store_id
  loop
    update public.products set stock_quantity = stock_quantity - v_item.quantity, updated_at = v_picked_at
    where id = v_item.product_id and store_id = p_store_id and stock_quantity >= v_item.quantity;
    if not found then raise exception 'Insufficient stock for pickup item'; end if;
  end loop;

  update public.store_fulfillments set status = 'picked_up', picked_up_at = v_picked_at, updated_at = v_picked_at
  where id = v_fulfillment.id;

  if not exists (
    select 1 from public.store_fulfillments sf
    where sf.order_id = p_order_id and sf.status <> 'picked_up'
  ) then
    update public.orders set status = 'picked_up', picked_up_at = v_picked_at, updated_at = v_picked_at where id = p_order_id;
  end if;

  return query select p_order_id, v_picked_at;
end;
$$;

revoke all on function public.complete_store_pickup(text, text, text) from public;
