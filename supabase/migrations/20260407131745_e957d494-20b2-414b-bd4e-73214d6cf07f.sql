
CREATE TABLE public.client_meta_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'meta',
  instagram_page_id text,
  instagram_username text,
  ad_account_id text,
  ad_account_name text,
  page_access_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, platform)
);

ALTER TABLE public.client_meta_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client meta accounts"
  ON public.client_meta_accounts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert client meta accounts"
  ON public.client_meta_accounts FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update client meta accounts"
  ON public.client_meta_accounts FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admins can manage client meta accounts"
  ON public.client_meta_accounts FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
