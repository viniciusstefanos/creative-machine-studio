ALTER TABLE public.client_meta_accounts 
  DROP CONSTRAINT IF EXISTS client_meta_accounts_client_id_platform_key;
ALTER TABLE public.client_meta_accounts 
  ADD CONSTRAINT client_meta_accounts_client_id_platform_key 
  UNIQUE (client_id, platform);