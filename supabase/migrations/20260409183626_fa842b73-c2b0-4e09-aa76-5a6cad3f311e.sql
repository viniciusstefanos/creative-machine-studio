
ALTER TABLE public.copies ADD COLUMN batch_label text;
ALTER TABLE public.copies ADD COLUMN parent_id uuid REFERENCES public.copies(id);

ALTER TABLE public.assets ADD COLUMN batch_label text;
ALTER TABLE public.assets ADD COLUMN parent_id uuid REFERENCES public.assets(id);

CREATE INDEX idx_copies_batch_label ON public.copies(batch_label);
CREATE INDEX idx_copies_parent_id ON public.copies(parent_id);
CREATE INDEX idx_assets_batch_label ON public.assets(batch_label);
CREATE INDEX idx_assets_parent_id ON public.assets(parent_id);
