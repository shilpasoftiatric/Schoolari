-- ============================================================
-- Schoolari v2 — MIGRATION PATCH
-- Run this in the Supabase SQL Editor on your NEW project
-- if you set it up using the original schema.sql.
--
-- This adds ALL columns that exist in the old (production) DB
-- but are missing from schema.sql.
-- All statements are safe to re-run (ADD COLUMN IF NOT EXISTS).
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- PATCH 1: profiles — missing columns from old DB
-- ─────────────────────────────────────────────────────────────

-- Stripe billing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id      text default null;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id  text default null;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_price_id         text default null;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status     text default null;

-- Extra profile/matching columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_type             text default '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ethnicity_tags          text[] default '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS financial_need          text default '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dashboard_priorities    text[] default '{}';

-- AI-generated content
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_dashboard_data       jsonb default null;

-- Streak / gamification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak          int default 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak          int default 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_date         date default null;

-- Career interests (added by migration_account_linking.sql)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS career_interests        text[] default '{}';


-- ─────────────────────────────────────────────────────────────
-- PATCH 2: scholarships — missing columns from old DB
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS state_eligibility_all    boolean default true;
ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS citizenship_requirement  text default '';


-- ─────────────────────────────────────────────────────────────
-- PATCH 3: site_settings — add table if missing
-- (not in original schema.sql, needed by admin panel)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_settings (
  id            uuid primary key default uuid_generate_v4(),
  site_name     text default 'Schoolari',
  support_email text default '',
  support_phone text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage site settings." ON public.site_settings;
CREATE POLICY "Admins can manage site settings."
  ON public.site_settings FOR ALL
  USING (false); -- only service_role key bypasses RLS

-- Insert default row
INSERT INTO public.site_settings (site_name, support_email, support_phone)
SELECT 'Schoolari', '', ''
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);


-- ─────────────────────────────────────────────────────────────
-- PATCH 4: user_roles — add table if missing
-- (not in original schema.sql, needed for admin role checks)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null,
  created_at timestamptz default now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles." ON public.user_roles;
CREATE POLICY "Users can view own roles."
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- PATCH 5: storage buckets — add if missing
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view documents"        ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files"       ON storage.objects;

CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('documents', 'vault') AND auth.role() = 'authenticated');

CREATE POLICY "Public can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('documents', 'vault'));

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id IN ('documents', 'vault') AND auth.uid()::text = (storage.foldername(name))[1]);


-- ─────────────────────────────────────────────────────────────
-- DONE — All missing columns and tables have been added.
-- You can now retry the CSV imports for profiles and scholarships.
-- ─────────────────────────────────────────────────────────────
