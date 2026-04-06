
ALTER TABLE public.asset_formats DROP CONSTRAINT asset_formats_category_check;

INSERT INTO public.asset_formats (name, slug, category, prompt_hint, active) VALUES
  ('Feed Quadrado', 'feed-square', 'social', 'Formato 1080x1080 para feed do Instagram/Facebook', true),
  ('Feed Retrato', 'feed-portrait', 'social', 'Formato 1080x1350 para feed do Instagram', true),
  ('Stories', 'stories', 'social', 'Formato 1080x1920 vertical para Stories/Reels', true),
  ('Carrossel', 'carousel', 'social', 'Slides 1080x1080 para carrossel do Instagram', true),
  ('Banner Web', 'banner-web', 'display', 'Banner 728x90 para display web', true),
  ('Leaderboard', 'leaderboard', 'display', 'Banner 970x250 leaderboard', true),
  ('Email Header', 'email-header', 'email', 'Header 600x200 para email marketing', true),
  ('Thumbnail YouTube', 'youtube-thumb', 'video', 'Thumbnail 1280x720 para YouTube', true);
