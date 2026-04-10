-- Expand generation_type to include designed_image
ALTER TABLE public.asset_templates DROP CONSTRAINT asset_templates_generation_type_check;
ALTER TABLE public.asset_templates ADD CONSTRAINT asset_templates_generation_type_check CHECK (generation_type = ANY (ARRAY['html_only'::text, 'image_only'::text, 'html_and_image'::text, 'designed_image'::text]));

-- Expand category to include single
ALTER TABLE public.asset_templates DROP CONSTRAINT asset_templates_category_check;
ALTER TABLE public.asset_templates ADD CONSTRAINT asset_templates_category_check CHECK (category = ANY (ARRAY['static'::text, 'carousel'::text, 'video'::text, 'story'::text, 'reels'::text, 'single'::text]));

-- Seed 2 designed_image templates
INSERT INTO public.asset_templates (name, slug, description, category, generation_type, width_px, height_px, aspect_ratio, slides_count_min, slides_count_max, visibility, is_base, active, image_prompt_template)
VALUES
  ('Post Design Completo', 'post-design-completo', 'Arte final gerada por IA com texto integrado na imagem — ideal para posts de feed', 'static', 'designed_image', 1080, 1350, '4:5', 1, 1, 'global', true, true, 'Create a professional social media post design at exactly {{width}}x{{height}} pixels. The design must include the following text rendered beautifully: Headline: "{{hook}}" Body: "{{body}}" CTA: "{{cta}}". Use these brand colors: {{brand_colors}}. Style: {{visual_style}}. The design should have clear visual hierarchy, strong contrast, and be optimized for Instagram feed.'),
  ('Story Design Completo', 'story-design-completo', 'Arte final gerada por IA com texto integrado — formato Stories/Reels vertical', 'story', 'designed_image', 1080, 1920, '9:16', 1, 1, 'global', true, true, 'Create a professional social media story design at exactly {{width}}x{{height}} pixels. The design must include the following text rendered beautifully: Headline: "{{hook}}" Body: "{{body}}" CTA: "{{cta}}". Use these brand colors: {{brand_colors}}. Style: {{visual_style}}. The design should be vertical, immersive, with bold typography and strong visual impact for Instagram Stories.');