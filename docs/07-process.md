# Process & handoff (not spec)

`docs/01`–`docs/05` are frozen. Product truth lives there. This file is only how
we build, branch, and resume. New chats can start from this file plus
`docs/06-updates-since-original.md`.

## Slice order

1. Restore originals + updates file — **done**
2. Catalog from Postgres — **done**
3. Thin admin (create store + all orders) — **done**
4. Store self-registration (`/store/register`) + admin approvals (`/admin`) + Store Portal (`/store`) with inventory (photo upload/camera) & orders list — **done**
5. Staff verify / stock decrement — **next**
6. Paystack → admin money + store withdraw
7. Sprint 6 polish

Ask before Paystack, Termii, or a merchant portal beyond store home.
Staff login OTP stays with Termii at the end.

## Branch stack (`main` is behind at `8349c09`)

```
main
└─ cursor/supabase-email-google-auth-6d55   PR #4
   └─ cursor/docs-catalog-postgres-7ad0     PR #5
      └─ cursor/thin-admin-7ad0             PR #6
         └─ cursor/store-portal-7ad0        PR #7  ← start here
```

New work: `cursor/<descriptive-name>-7ad0`, stacked on the latest slice branch.
PRs via ManagePullRequest. Do not commit `.env.local` or `.data/`.

## Environment

- Next.js 16.3.4, React 19, port 43147 (`npm run dev`).
- Hosted Supabase `ftwiuhdnukjoeabiusxz`. Session pooler
  `aws-0-us-west-2.pooler.supabase.com:5432`, user `postgres.<project-ref>`.
  Encode `!` as `%21`. No `[brackets]`. Direct `db.*.supabase.co` is IPv6-only.
- `.env.local` (gitignored): `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `ADMIN_EMAILS=you@yourmail.com`.
- Google OAuth secrets only in Supabase → Authentication → Providers → Google.
  Redirect: `https://ftwiuhdnukjoeabiusxz.supabase.co/auth/v1/callback`.

## DB rules

- Additive migrations only. Never drop/rename live tables.
- `products` is the catalog (spec’s `items`). `orders.id` is `SG-XXXXX`.
- Buyer login email + Google; guest checkout stays; customer OTP removed.
- Fees still prototype (₦150–₦250 convenience + hub consolidation). Do not grow.

## Verify a slice

- `npm run db:smoke`
- `npx tsc --noEmit`
- Browser pass on the changed page, then update the PR.

## Resume

Check out the latest branch (`cursor/store-portal-7ad0` today), read this file
and `docs/06-updates-since-original.md`, then do the next unchecked slice
(staff verify / stock decrement). Wait for “go” before implementing; do not
skip ahead to Paystack or Termii.
