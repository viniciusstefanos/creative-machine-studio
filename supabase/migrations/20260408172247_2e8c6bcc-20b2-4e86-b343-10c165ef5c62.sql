ALTER TABLE public.client_meta_accounts
  ADD COLUMN IF NOT EXISTS pixel_id text;