
UPDATE asset_templates
SET editable_fields = jsonb_set(
  jsonb_set(editable_fields, '{background_color,locked}', 'true'),
  '{accent_color,locked}', 'true'
)
WHERE slug = 'carousel-twitter-style';
