
-- 1. Create asset_templates table
CREATE TABLE public.asset_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  thumbnail_url text,
  category text NOT NULL CHECK (category IN ('static', 'carousel', 'video')),
  generation_type text NOT NULL CHECK (generation_type IN ('html_only', 'image_only', 'html_and_image')),
  width_px integer NOT NULL,
  height_px integer NOT NULL,
  aspect_ratio text,
  slides_count_min integer DEFAULT 1,
  slides_count_max integer DEFAULT 1,
  system_prompt text,
  html_scaffold text,
  image_prompt_template text,
  editable_fields jsonb,
  is_base boolean DEFAULT false,
  active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 2. Create asset_template_renders table
CREATE TABLE public.asset_template_renders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  slide_index integer DEFAULT 0,
  html_content text,
  image_url text,
  png_url text,
  status text DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'error')),
  created_at timestamptz DEFAULT now()
);

-- 3. Alter assets table
ALTER TABLE public.assets ADD COLUMN template_id uuid REFERENCES public.asset_templates(id);
ALTER TABLE public.assets ADD COLUMN render_config jsonb;

-- 4. RLS for asset_templates
ALTER TABLE public.asset_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active templates"
  ON public.asset_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage templates"
  ON public.asset_templates FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- 5. RLS for asset_template_renders
ALTER TABLE public.asset_template_renders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read renders"
  ON public.asset_template_renders FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert renders"
  ON public.asset_template_renders FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update renders"
  ON public.asset_template_renders FOR UPDATE TO authenticated
  USING (true);

-- 6. Seed 5 base templates
INSERT INTO public.asset_templates (name, slug, category, generation_type, width_px, height_px, aspect_ratio, slides_count_min, slides_count_max, description, is_base, system_prompt, image_prompt_template, editable_fields) VALUES
(
  'Carrossel Estilo Twitter',
  'carousel-twitter-style',
  'carousel',
  'html_only',
  1080, 1080, '1:1', 3, 10,
  'Cards com fundo escuro, tipografia grande, estilo thread de Twitter/X.',
  true,
  'Você é um designer especializado em carrosséis no estilo Twitter/X. Gere HTML para cada slide com: fundo escuro, texto grande e impactante, número do slide no canto, identidade visual consistente entre slides. Cada slide deve conter uma única ideia do copy — divida o corpo em pontos. Retorne APENAS um array JSON sem markdown, sem explicação: [{"slide_index": 0, "html": "..."}]. O HTML de cada slide deve ser auto-contido com CSS inline, dimensões 1080x1080px.',
  NULL,
  '{"background_color": {"label": "Cor de fundo", "type": "color", "default": "#0F1318"}, "accent_color": {"label": "Cor de destaque", "type": "color", "default": "#00C9A7"}, "font_size": {"label": "Tamanho da fonte", "type": "select", "options": ["compact", "normal", "large"], "default": "normal"}}'::jsonb
),
(
  'Carrossel de Imagens',
  'carousel-images',
  'carousel',
  'image_only',
  1080, 1080, '1:1', 3, 5,
  'Cada slide é uma imagem gerada por IA com base no copy.',
  true,
  NULL,
  'Imagem {{visual_style}} com paleta {{color_palette}} para Instagram. Tema: {{slide_content}}. Sem texto. Proporção quadrada 1:1.',
  '{"visual_style": {"label": "Estilo visual", "type": "select", "options": ["fotorrealista", "ilustração", "minimalista", "editorial"], "default": "fotorrealista"}, "color_palette": {"label": "Paleta de cores", "type": "select", "options": ["quente", "frio", "neutro", "vibrante"], "default": "neutro"}}'::jsonb
),
(
  'Post Feed — Imagem + Texto',
  'feed-image-text',
  'static',
  'html_and_image',
  1080, 1080, '1:1', 1, 1,
  'Imagem de fundo gerada por IA com overlay HTML de texto.',
  true,
  'Gere HTML 1080x1080px para overlay de texto em post de Instagram. A imagem de fundo já existe como URL. Use position:absolute para o overlay. Inclua gancho em destaque e CTA menor. CSS inline apenas. Retorne apenas o HTML.',
  'Fotografia profissional para Instagram. Tema: {{hook}}. Sem texto, composição editorial.',
  '{"overlay_position": {"label": "Posição do texto", "type": "select", "options": ["top", "center", "bottom"], "default": "bottom"}, "overlay_opacity": {"label": "Opacidade do overlay", "type": "slider", "min": 0, "max": 100, "default": 60}, "text_color": {"label": "Cor do texto", "type": "color", "default": "#FFFFFF"}}'::jsonb
),
(
  'Story — Texto sobre Gradiente',
  'story-gradient-text',
  'static',
  'html_only',
  1080, 1920, '9:16', 1, 1,
  'Story vertical com gradiente de fundo, tipografia grande, gancho e CTA.',
  true,
  'Gere HTML 1080x1920px para story Instagram. Gradiente de fundo usando as cores fornecidas, texto centralizado, gancho grande no topo, CTA no rodapé. CSS inline. Retorne apenas o HTML.',
  NULL,
  '{"gradient_from": {"label": "Cor inicial do gradiente", "type": "color", "default": "#090C10"}, "gradient_to": {"label": "Cor final", "type": "color", "default": "#1C2128"}, "accent_color": {"label": "Cor de destaque", "type": "color", "default": "#00C9A7"}}'::jsonb
),
(
  'Banner — Só Imagem',
  'banner-image-only',
  'static',
  'image_only',
  1080, 1080, '1:1', 1, 1,
  'Imagem pura gerada por IA. Sem texto.',
  true,
  NULL,
  'Imagem {{visual_style}} para post de Instagram. Tema: {{full_copy}}. Sem texto, proporção 1:1.',
  '{"visual_style": {"label": "Estilo visual", "type": "select", "options": ["fotorrealista", "ilustração flat", "editorial"], "default": "fotorrealista"}}'::jsonb
);
