# Upload this schema to Supabase

Stillgood uses **plain PostgreSQL**. The same files run locally (PGlite) and on hosted Supabase.

## What lives where

| Data | Local now | After you set `DATABASE_URL` |
|---|---|---|
| Stores, categories, products, reviews | Seeded into PGlite; UI still reads `src/lib/data.ts` | Same SQL is in your Supabase project |
| Customers, orders, order items | **Postgres / PGlite** | Supabase Postgres |
| Guest cart, OTP, session cookie | Cookies (not the database) | Unchanged |

`SG-XXXXX` is still only an order label.

## Upload (easiest)

1. Create a Supabase project.
2. SQL Editor → paste and run `supabase/migrations/20260903100000_init.sql`.
3. SQL Editor → paste and run `supabase/seed.sql`.
4. SQL Editor → paste and run `supabase/rls.sql` (catalog readable by `anon`; orders stay server-only).
5. Settings → Database → copy the URI into `DATABASE_URL` (or `SUPABASE_DB_URL`).
6. Restart the app. It will use `postgres` instead of PGlite.

CLI equivalent after `supabase link`:

```bash
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
psql "$DATABASE_URL" -f supabase/rls.sql
```

Regenerate seed from the TypeScript catalog:

```bash
npm run db:generate-seed
```

Do not commit `.data/` (local PGlite files).
