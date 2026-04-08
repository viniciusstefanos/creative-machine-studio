ALTER TABLE public.briefs
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS consolidated_context jsonb;