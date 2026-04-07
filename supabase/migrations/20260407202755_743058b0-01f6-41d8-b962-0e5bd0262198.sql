
-- Expand ad_campaigns with new fields
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS ad_account_id text,
  ADD COLUMN IF NOT EXISTS platform_adset_id text,
  ADD COLUMN IF NOT EXISTS adset_name text,
  ADD COLUMN IF NOT EXISTS daily_budget_cents integer,
  ADD COLUMN IF NOT EXISTS targeting jsonb,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- Create ad_creatives table
CREATE TABLE public.ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE CASCADE NOT NULL,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  name text,
  caption text,
  link text,
  platform_ad_id text,
  platform_creative_id text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ad creatives"
  ON public.ad_creatives FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert ad creatives"
  ON public.ad_creatives FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update ad creatives"
  ON public.ad_creatives FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete ad creatives"
  ON public.ad_creatives FOR DELETE TO authenticated USING (true);
