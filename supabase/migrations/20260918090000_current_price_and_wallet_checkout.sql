-- Applies automatically via the app-startup migration runner in src/lib/db/client.ts.

-- Stores may list an item with only a current selling price. The original
-- shelf price and base markdown become optional; current_price holds the
-- mandatory selling price the store enters (drift continues from it).
alter table public.products
  alter column original_price drop not null;
alter table public.products
  alter column base_discount_percent drop not null;

alter table public.products
  add column if not exists current_price integer;

-- Backfill: derive the current price for existing rows from the drift model.
update public.products
set current_price = round(original_price * (1 - least(85, base_discount_percent +
      floor(greatest(0, (current_date - listed_at)) / 7) * 2.5) / 100))
where current_price is null and original_price is not null;

-- Any row still missing a price (should not happen) falls back safely.
update public.products set current_price = 0 where current_price is null;
alter table public.products
  alter column current_price set not null;
alter table public.products
  alter column current_price set default 0;

alter table public.products
  drop constraint if exists products_current_price_check;
alter table public.products
  add constraint products_current_price_check check (current_price >= 0);

-- Only Paystack and the Stillgood Wallet are supported checkout rails.
-- The legacy rails remain readable for historical orders.
alter table public.orders
  drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('paystack', 'flutterwave', 'bank_transfer', 'wallet'));
