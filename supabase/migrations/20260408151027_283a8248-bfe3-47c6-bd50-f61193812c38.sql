-- Drop old category constraint and add new one with story/reels
ALTER TABLE public.asset_templates DROP CONSTRAINT asset_templates_category_check;
ALTER TABLE public.asset_templates ADD CONSTRAINT asset_templates_category_check CHECK (category = ANY (ARRAY['static','carousel','video','story','reels']));

-- Add funnel_stage column
ALTER TABLE public.asset_templates ADD COLUMN IF NOT EXISTS funnel_stage text;

-- Update categories for stories and reels
UPDATE public.asset_templates SET category = 'reels' WHERE slug = 'reels-cover';
UPDATE public.asset_templates SET category = 'story' WHERE slug IN ('story-gradient-text', 'story-interativo');

-- Set funnel stages
UPDATE public.asset_templates SET funnel_stage = 'top' WHERE slug IN ('post-frase-forte', 'story-gradient-text', 'story-interativo', 'reels-cover', 'carousel-twitter-style');
UPDATE public.asset_templates SET funnel_stage = 'middle' WHERE slug IN ('carousel-educativo', 'carousel-listicle', 'post-dado-estatistica', 'carousel-antes-depois', 'feed-image-text');
UPDATE public.asset_templates SET funnel_stage = 'bottom' WHERE slug IN ('post-cta-direto', 'banner-image-only', 'carousel-images');

-- Normalize editable_fields from array to object format
UPDATE public.asset_templates SET editable_fields = (
  SELECT jsonb_object_agg(elem->>'key', jsonb_build_object('label', elem->>'label', 'type', COALESCE(elem->>'type', 'text'), 'default', COALESCE(elem->>'default', '')))
  FROM jsonb_array_elements(editable_fields) elem
) WHERE jsonb_typeof(editable_fields) = 'array';