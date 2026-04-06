
INSERT INTO storage.buckets (id, name, public)
VALUES ('briefs', 'briefs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload briefs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'briefs');

CREATE POLICY "Authenticated users can read briefs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'briefs');
