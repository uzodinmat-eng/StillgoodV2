# Updates since original

The five files `docs/01-product-spec.md` through `docs/05-open-questions.md` are the
**frozen source of truth**. Do not edit them. Put process notes, implementation
status, and compatibility decisions here. Branch stack and resume steps are in
`docs/07-process.md`.

## What this repo is today

Stillgood customer **web** on Next.js 16 (port 43147), plus the server that will
host admin. Expo customer/store apps from the sprint plan are not started.

Buyer login: **email (main)** and **Google (optional)**. Guest checkout stays.
`SG-XXXXX` is the order label only. Customer WhatsApp OTP is removed. Phone is
checkout/pickup contact. The 4-digit PIN is for store attendants.

Hosted Supabase project `ftwiuhdnukjoeabiusxz`. Use the **session pooler**
(`aws-0-us-west-2.pooler.supabase.com:5432`, user `postgres.<project-ref>`).
Direct `db.*.supabase.co` is IPv6-only from some environments. Encode `!` in the
password as `%21`. No `[brackets]` from the dashboard template.

Secrets stay in gitignored `.env.local`: `DATABASE_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. Do not commit `.env.local` or `.data/`.

Google Client ID/secret belong only in Supabase → Authentication → Providers →
Google. Redirect: `https://<project-ref>.supabase.co/auth/v1/callback`.

## Live schema (do not wipe)

Physical tables already on the hosted project (text ids, not the illustrative
UUIDs in `02-data-model.md`):

- `stores`, `categories`, `products`, `store_review_scores`, `store_reviews`
- `customers` (`auth_user_id`, nullable phone) — buyer profile, not `profiles`
- `orders` (`id` = `SG-XXXXX`), `order_items`
- `wallet_balance` column on customers (mocked ₦0 until Paystack)
- Extra order columns from the web prototype: `platform_fee`,
  `requires_consolidation`, `origin_stores`, `hub_batch`

`products` is the catalog table (the spec’s `items`). Keep the name. New
concepts (`businesses`, `staff`, `sub_orders`, `ledger_entries`) are **additive**
migrations later. Never `DROP` live tables or change primary-key types to
realign names.

## Catalog (this slice)

Shop reads `public.stores` / `public.categories` / `public.products` /
reviews via `src/lib/db/catalog.ts`. The same helpers are what admin will use.
`src/lib/data.ts` remains the seed source for `npm run db:generate-seed` only.

Cart stays a cookie. Drift price is still computed in the app from
`original_price` + `base_discount_percent` + weekly rate (not start/floor yet).

## Fees & fulfillment still on the prototype path

Until a dedicated slice: checkout still uses the ₦150–₦250 convenience fee and
hub-consolidation slots. Spec destination is `p(x) = 800 + 500(x − 1)` and
pickup-only (no hub). Do not grow those prototype features. Old order rows keep
their stored columns.

## Agreed build order (do not skip ahead)

1. Restore original docs (frozen) + this file — **done**.
2. Catalog from Postgres (shop and admin share the same rows) — **done**.
3. Thin admin: create a store + see all orders — **this slice**. `/admin` is
   gated by email (`ADMIN_EMAILS` in `.env.local`) and `customers.role`.
   Creating a store inserts into the existing `stores` table. Orders list is
   every `SG-XXXXX`. No CAC, bank, or store-owner login yet.
4. Thin store home: inventory + today’s pick list.
5. Staff verify / stock decrement.
6. Paystack → admin money + store withdraw.
7. Full Sprint 6 polish (buckets, health, support tools).

Ask before Paystack, Termii, or a merchant portal beyond the thin store home.
Staff login OTP stays with Termii at the end.

## Prototype extras (keep working, do not treat as spec)

- Guest checkout
- Cookie cart (spec wants server-side carts later)
- Pickup QR on the pass (spec: 4-digit code only, no QR)
- Seeded store reviews (spec: rate only after Released)
- Next.js-only customer UI (spec: Expo customer + store apps later)
