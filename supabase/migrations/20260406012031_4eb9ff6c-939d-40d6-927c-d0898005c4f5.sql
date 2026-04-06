
-- Allow authenticated users to insert clients
CREATE POLICY "Authenticated users can insert clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update clients
CREATE POLICY "Authenticated users can update clients"
ON public.clients FOR UPDATE TO authenticated
USING (true);

-- Allow authenticated users to insert ad campaigns
CREATE POLICY "Authenticated users can insert ad campaigns"
ON public.ad_campaigns FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update ad campaigns
CREATE POLICY "Authenticated users can update ad campaigns"
ON public.ad_campaigns FOR UPDATE TO authenticated
USING (true);

-- Allow authenticated users to insert utm configs
CREATE POLICY "Authenticated users can insert utm configs"
ON public.utm_configs FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update utm configs
CREATE POLICY "Authenticated users can update utm configs"
ON public.utm_configs FOR UPDATE TO authenticated
USING (true);

-- Allow authenticated users to insert activation members
CREATE POLICY "Authenticated users can insert activation members"
ON public.activation_members FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update activations they created
CREATE POLICY "Authenticated users can update own activations"
ON public.activations FOR UPDATE TO authenticated
USING (auth.uid() = created_by);
