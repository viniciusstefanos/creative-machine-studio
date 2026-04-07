
CREATE TABLE public.brief_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activation_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  category text DEFAULT 'geral',
  raw_text text,
  extracted_fields jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.brief_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read brief files"
  ON public.brief_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert brief files"
  ON public.brief_files FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update brief files"
  ON public.brief_files FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete brief files"
  ON public.brief_files FOR DELETE TO authenticated USING (true);
