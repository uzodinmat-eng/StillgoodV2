# Upload this schema to Supabase

Stillgood uses **plain PostgreSQL**. The same files run locally (PGlite) and on hosted Supabase.

## What lives where

| Data | Local now | After you set `DATABASE_URL` |
|---|---|---|
| Stores, categories, products, reviews | Seeded into PGlite; UI still reads `src/lib/data.ts` | Same SQL is in your Supabase project |
| Customers, orders, order items | **Postgres / PGlite** | Supabase Postgres |
| Buyer login | Supabase Auth (email + Google) | Same |
| Guest cart | Cookie | Unchanged |

`SG-XXXXX` is still only an order label. Customer WhatsApp OTP is not used. The 4-digit pickup PIN is for store attendants.

## Upload (easiest)

1. Create a Supabase project.
2. SQL Editor → paste and run each file in `supabase/migrations/` in timestamp order. If the editor warns about RLS on the init file, choose **Run and enable RLS**.
3. SQL Editor → paste and run `supabase/seed.sql`.
4. SQL Editor → paste and run `supabase/rls.sql` (catalog readable by `anon`; orders stay server-only). Confirm the destructive-ops warning; `REVOKE` is intended.
5. Settings → Database → copy the **Session pooler** URI (port **5432**) into `DATABASE_URL`. Direct `db.*.supabase.co` is often IPv6-only. Encode `!` in the password as `%21`. Do not keep `[brackets]` from the template.
6. Settings → API → Project URL + publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Secret key → `SUPABASE_SERVICE_ROLE_KEY` (server only).
7. Authentication → Providers: enable **Email**. Enable **Google** in the dashboard with the Google Cloud client ID/secret (not in the Next.js env). Redirect: `https://<project-ref>.supabase.co/auth/v1/callback`. Site URL `http://localhost:43147`, redirect URLs `http://localhost:43147/**`.
8. Restart the app.

CLI equivalent after `supabase link`:

```bash
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
psql "$DATABASE_URL" -f supabase/rls.sql
```

`supabase db reset` is for **local** CLI Docker only. Do not run it against the hosted project.

Regenerate seed from the TypeScript catalog:

```bash
npm run db:generate-seed
```

Do not commit `.env.local` or `.data/`.
