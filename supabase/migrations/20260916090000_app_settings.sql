-- Admin-managed app settings, seeded with the shared admin store-view secret.
-- The secret is stored as a scrypt hash ("salt:hex"), never plaintext.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- No default seed here: the first value is written by the admin dashboard
-- rotation action (setAdminStoreViewPasswordAction). Until a row exists,
-- enterAdminStoreViewAction falls back to the ADMIN_STORE_VIEW_PASSWORD env var.
