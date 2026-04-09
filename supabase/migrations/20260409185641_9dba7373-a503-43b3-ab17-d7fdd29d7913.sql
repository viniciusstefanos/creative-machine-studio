
CREATE POLICY "Authenticated users can insert templates"
ON public.asset_templates
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update templates"
ON public.asset_templates
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete non-base templates"
ON public.asset_templates
FOR DELETE
TO authenticated
USING (is_base IS DISTINCT FROM true);
