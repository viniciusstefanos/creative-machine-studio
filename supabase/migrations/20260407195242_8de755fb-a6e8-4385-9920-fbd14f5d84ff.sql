
CREATE OR REPLACE FUNCTION public.generate_asset_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tpl_name text;
  copy_channel text;
  copy_hook text;
  seq_num integer;
  short_id text;
  final_name text;
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    SELECT name INTO tpl_name FROM public.asset_templates WHERE id = NEW.template_id;
  END IF;
  tpl_name := COALESCE(tpl_name, NEW.category, 'Peça');

  IF NEW.copy_id IS NOT NULL THEN
    SELECT channel, hook INTO copy_channel, copy_hook
    FROM public.copies WHERE id = NEW.copy_id;
  END IF;

  SELECT COUNT(*) + 1 INTO seq_num
  FROM public.assets
  WHERE activation_id = NEW.activation_id
    AND COALESCE(template_id, '00000000-0000-0000-0000-000000000000') = COALESCE(NEW.template_id, '00000000-0000-0000-0000-000000000000');

  short_id := left(replace(NEW.id::text, '-', ''), 4);

  final_name := tpl_name || ' #' || seq_num;

  IF copy_hook IS NOT NULL AND length(copy_hook) > 0 THEN
    final_name := final_name || ' — ' || left(copy_hook, 40);
    IF length(copy_hook) > 40 THEN
      final_name := final_name || '…';
    END IF;
  END IF;

  IF copy_channel IS NOT NULL AND length(copy_channel) > 0 THEN
    final_name := final_name || ' [' || copy_channel || ']';
  END IF;

  final_name := final_name || ' · ' || short_id;

  NEW.name := final_name;
  RETURN NEW;
END;
$function$;
