
-- Allow authenticated users to delete assets
CREATE POLICY "Authenticated users can delete assets"
ON public.assets
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to delete asset_template_renders
CREATE POLICY "Authenticated users can delete renders"
ON public.asset_template_renders
FOR DELETE
TO authenticated
USING (true);
