
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read asset files"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

CREATE POLICY "Authenticated users can upload asset files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets');

CREATE POLICY "Authenticated users can update asset files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'assets');
