-- Documented picking surcharge: 800 NGN for the first store plus 500 NGN per additional store.
alter table public.orders
  add column if not exists pickup_fee integer not null default 0;
