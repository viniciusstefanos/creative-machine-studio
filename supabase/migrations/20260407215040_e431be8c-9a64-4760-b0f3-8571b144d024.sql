
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
  global_num integer;
  short_id text;
  act_slug text;
  final_name text;
BEGIN
  global_num := nextval('public.asset_global_seq');

  -- Get activation slug
  SELECT slug INTO act_slug FROM public.activations WHERE id = NEW.activation_id;

  IF NEW.template_id IS NOT NULL THEN
    SELECT name INTO tpl_name FROM public.asset_templates WHERE id = NEW.template_id;
  END IF;
  tpl_name := COALESCE(tpl_name, NEW.category, 'Peça');

  IF NEW.copy_id IS NOT NULL THEN
    SELECT channel, hook INTO copy_channel, copy_hook
    FROM public.copies WHERE id = NEW.copy_id;
  END IF;

  short_id := left(replace(NEW.id::text, '-', ''), 4);

  -- Build name: [SLUG ·] PÇ-0042 — Hook [canal] · Template · hash
  final_name := '';
  IF act_slug IS NOT NULL AND length(act_slug) > 0 THEN
    final_name := act_slug || ' · ';
  END IF;

  final_name := final_name || 'PÇ-' || lpad(global_num::text, 4, '0');

  IF copy_hook IS NOT NULL AND length(copy_hook) > 0 THEN
    final_name := final_name || ' — ' || left(copy_hook, 40);
    IF length(copy_hook) > 40 THEN
      final_name := final_name || '…';
    END IF;
  END IF;

  IF copy_channel IS NOT NULL AND length(copy_channel) > 0 THEN
    final_name := final_name || ' [' || copy_channel || ']';
  END IF;

  final_name := final_name || ' · ' || tpl_name || ' · ' || short_id;

  NEW.name := final_name;
  RETURN NEW;
END;
$function$;
