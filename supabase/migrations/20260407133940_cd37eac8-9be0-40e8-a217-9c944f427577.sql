ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS caption text;

-- Also add DELETE policy for scheduled_posts
CREATE POLICY "Authenticated users can delete scheduled posts"
ON public.scheduled_posts
FOR DELETE
TO authenticated
USING (true);