CREATE POLICY "Authenticated users can update prompt_templates"
  ON public.prompt_templates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);