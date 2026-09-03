-- Run on hosted Supabase after the init migration (SQL editor or psql).
-- Skipped locally: PGlite has no `anon` / `authenticated` roles.
-- The Next.js app should use DATABASE_URL (Postgres role), which bypasses RLS.

alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_review_scores enable row level security;
alter table public.store_reviews enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "public read stores" on public.stores;
create policy "public read stores" on public.stores
  for select to anon, authenticated using (true);

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories
  for select to anon, authenticated using (true);

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products
  for select to anon, authenticated using (true);

drop policy if exists "public read store_review_scores" on public.store_review_scores;
create policy "public read store_review_scores" on public.store_review_scores
  for select to anon, authenticated using (true);

drop policy if exists "public read store_reviews" on public.store_reviews;
create policy "public read store_reviews" on public.store_reviews
  for select to anon, authenticated using (true);

grant select on public.stores, public.categories, public.products,
  public.store_review_scores, public.store_reviews
  to anon, authenticated;

-- Buyers and staff talk to the database through the Next.js server, not the anon key.
revoke all on public.customers from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
