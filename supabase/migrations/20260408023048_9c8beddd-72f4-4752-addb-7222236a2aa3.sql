
ALTER TABLE public.asset_templates ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.asset_templates ADD COLUMN visibility text NOT NULL DEFAULT 'global';

CREATE TABLE public.client_template_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.asset_templates(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE(client_id, template_id)
);

ALTER TABLE public.client_template_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client_template_settings"
  ON public.client_template_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert client_template_settings"
  ON public.client_template_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update client_template_settings"
  ON public.client_template_settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete client_template_settings"
  ON public.client_template_settings FOR DELETE TO authenticated USING (true);
