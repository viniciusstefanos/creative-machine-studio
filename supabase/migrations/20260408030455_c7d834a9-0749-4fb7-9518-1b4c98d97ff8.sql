CREATE POLICY "Authenticated users can delete copies"
ON public.copies
FOR DELETE
TO authenticated
USING (true);