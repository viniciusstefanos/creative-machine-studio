
-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  contact_name TEXT,
  contact_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage clients" ON public.clients FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Activations
CREATE TABLE public.activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('seasonal', 'ongoing')),
  status TEXT CHECK (status IN ('active', 'paused', 'done')) DEFAULT 'active',
  landing_page_url TEXT,
  budget NUMERIC,
  tags TEXT[],
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read activations" ON public.activations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert activations" ON public.activations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can manage activations" ON public.activations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Activation Members
CREATE TABLE public.activation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id UUID REFERENCES public.activations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('lead', 'contributor')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.activation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read activation members" ON public.activation_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage activation members" ON public.activation_members FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- UTM Configs
CREATE TABLE public.utm_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id UUID REFERENCES public.activations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  generated_url TEXT
);
ALTER TABLE public.utm_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read utm configs" ON public.utm_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage utm configs" ON public.utm_configs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Briefs
CREATE TABLE public.briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id UUID REFERENCES public.activations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  tone_of_voice TEXT,
  target_audience TEXT,
  objectives TEXT,
  references_urls TEXT[],
  extra_context TEXT,
  source_file_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read briefs" ON public.briefs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert briefs" ON public.briefs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update briefs" ON public.briefs FOR UPDATE TO authenticated USING (true);

-- Copies
CREATE TABLE public.copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id UUID REFERENCES public.activations(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('post', 'ad', 'landing', 'email')),
  channel TEXT,
  funnel_stage TEXT CHECK (funnel_stage IN ('top', 'mid', 'bottom')),
  hook TEXT,
  body TEXT,
  cta TEXT,
  full_copy TEXT,
  landing_page_url TEXT,
  tags TEXT[],
  status TEXT CHECK (status IN ('draft', 'review', 'approved', 'rejected')) DEFAULT 'draft',
  feedback TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.copies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read copies" ON public.copies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert copies" ON public.copies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update copies" ON public.copies FOR UPDATE TO authenticated USING (true);

-- Asset Formats
CREATE TABLE public.asset_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT CHECK (category IN ('static', 'video', 'carousel')),
  name TEXT,
  slug TEXT UNIQUE,
  prompt_hint TEXT,
  active BOOLEAN DEFAULT true
);
ALTER TABLE public.asset_formats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read asset formats" ON public.asset_formats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage asset formats" ON public.asset_formats FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Assets
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id UUID REFERENCES public.activations(id) ON DELETE CASCADE NOT NULL,
  copy_id UUID REFERENCES public.copies(id) ON DELETE SET NULL,
  format_id UUID REFERENCES public.asset_formats(id) ON DELETE SET NULL,
  category TEXT CHECK (category IN ('static', 'video', 'carousel')),
  html_content TEXT,
  image_url TEXT,
  file_url TEXT,
  export_url TEXT,
  export_format TEXT CHECK (export_format IN ('png', 'pdf', 'mp4')),
  tags TEXT[],
  status TEXT CHECK (status IN ('generating', 'review', 'approved', 'rejected', 'scheduled', 'published')) DEFAULT 'generating',
  feedback TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update assets" ON public.assets FOR UPDATE TO authenticated USING (true);

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT CHECK (entity_type IN ('copy', 'asset')) NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Ad Campaigns
CREATE TABLE public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id UUID REFERENCES public.activations(id) ON DELETE CASCADE NOT NULL,
  platform TEXT CHECK (platform IN ('meta', 'google')),
  name TEXT,
  objective TEXT,
  budget NUMERIC,
  status TEXT CHECK (status IN ('draft', 'active', 'paused', 'done')) DEFAULT 'draft',
  platform_campaign_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ad campaigns" ON public.ad_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ad campaigns" ON public.ad_campaigns FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Scheduled Posts
CREATE TABLE public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  activation_id UUID REFERENCES public.activations(id) ON DELETE CASCADE NOT NULL,
  channel TEXT,
  final_url TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('scheduled', 'published', 'failed')) DEFAULT 'scheduled',
  platform_post_id TEXT
);
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read scheduled posts" ON public.scheduled_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert scheduled posts" ON public.scheduled_posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update scheduled posts" ON public.scheduled_posts FOR UPDATE TO authenticated USING (true);

-- Metrics
CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  activation_id UUID REFERENCES public.activations(id) ON DELETE CASCADE NOT NULL,
  date DATE,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  cost_per_result NUMERIC,
  spend NUMERIC,
  results INTEGER,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read metrics" ON public.metrics FOR SELECT TO authenticated USING (true);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('copy_review', 'asset_review', 'published', 'rejected', 'assigned')),
  entity_type TEXT CHECK (entity_type IN ('copy', 'asset', 'activation')),
  entity_id UUID,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
