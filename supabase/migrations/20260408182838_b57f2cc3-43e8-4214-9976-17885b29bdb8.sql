
ALTER TABLE public.utm_configs
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS use_dynamic_params boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dynamic_content_pattern text;

ALTER TABLE public.utm_configs DROP CONSTRAINT IF EXISTS utm_configs_activation_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS utm_configs_activation_channel_idx
  ON public.utm_configs(activation_id, channel);
