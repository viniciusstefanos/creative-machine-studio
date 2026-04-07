
CREATE OR REPLACE FUNCTION public.generate_asset_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tpl_name text;
  seq_num integer;
BEGIN
  -- Get template name if available
  IF NEW.template_id IS NOT NULL THEN
    SELECT name INTO tpl_name FROM public.asset_templates WHERE id = NEW.template_id;
  END IF;
  
  -- Fallback to category
  IF tpl_name IS NULL THEN
    tpl_name := COALESCE(NEW.category, 'Peça');
  END IF;
  
  -- Count existing assets with same template in this activation
  SELECT COUNT(*) + 1 INTO seq_num
  FROM public.assets
  WHERE activation_id = NEW.activation_id
    AND COALESCE(template_id, '00000000-0000-0000-0000-000000000000') = COALESCE(NEW.template_id, '00000000-0000-0000-0000-000000000000');
  
  NEW.name := tpl_name || ' #' || seq_num;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_asset_name
  BEFORE INSERT ON public.assets
  FOR EACH ROW
  WHEN (NEW.name IS NULL)
  EXECUTE FUNCTION public.generate_asset_name();
