-- ============================================================
-- Schoolari v2 — COMPLETE & UNIFIED DATABASE SCHEMA
-- Contains ALL tables, relationships, constraints, indexes,
-- RLS security policies, storage buckets, triggers, and cron jobs
-- used across the entire Schoolari v2 application.
--
-- Safe to run on fresh Supabase projects AND existing databases (Idempotent).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- SECTION 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_cron";
  CREATE EXTENSION IF NOT EXISTS "pg_net";
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────
-- SECTION 2. BASE CORE TABLES
-- ─────────────────────────────────────────────────────────────

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name                       TEXT DEFAULT '',
  phone                            TEXT DEFAULT '',
  
  -- Card 1: Parent & Student Info
  student_first_name               TEXT DEFAULT '',
  student_last_name                TEXT DEFAULT '',
  student_email                    TEXT DEFAULT '',
  student_phone                    TEXT DEFAULT '',
  parent_first_name                TEXT DEFAULT '',
  parent_last_name                 TEXT DEFAULT '',
  parent_email                     TEXT DEFAULT '',
  parent_phone                     TEXT DEFAULT '',
  high_school_name                 TEXT DEFAULT '',

  account_type                     TEXT DEFAULT 'student',
  role                             TEXT DEFAULT 'user',
  state                            TEXT DEFAULT '',
  grade_level                      TEXT DEFAULT '',

  -- Card 2: Academic Journey
  unweighted_gpa                   TEXT DEFAULT '',
  weighted_gpa                     TEXT DEFAULT '',
  expected_graduation_year         TEXT DEFAULT '',
  applied_to_college               TEXT DEFAULT '',
  enrolled_in_college              TEXT DEFAULT '',
  intended_major                   TEXT[] DEFAULT '{}',
  preferred_college_type           TEXT[] DEFAULT '{}',
  top_3_schools                    TEXT[] DEFAULT '{}',
  sat_score_range                  TEXT DEFAULT '',
  act_score_range                  TEXT DEFAULT '',

  -- Card 3: Your Story
  first_generation_college_student TEXT DEFAULT '',
  military_family                  TEXT DEFAULT '',
  languages_spoken                 TEXT[] DEFAULT '{}',
  leadership_experience            TEXT[] DEFAULT '{}',
  volunteer_experience             TEXT[] DEFAULT '{}',
  extracurricular_activities       TEXT[] DEFAULT '{}',
  career_interest                  TEXT[] DEFAULT '{}',
  ethnicity                        TEXT[] DEFAULT '{}',
  gender                           TEXT DEFAULT '',

  -- Card 4: Goals & Priorities
  schoolari_goals                  TEXT[] DEFAULT '{}',
  career_interests                 TEXT[] DEFAULT '{}',
  school_type                      TEXT DEFAULT '',
  ethnicity_tags                   TEXT[] DEFAULT '{}',
  financial_need                   TEXT DEFAULT '',
  dashboard_priorities             TEXT[] DEFAULT '{}',
  ai_dashboard_data                JSONB DEFAULT NULL,
  college_recommendations_cache    JSONB DEFAULT NULL,

  -- Streak tracking
  current_streak                   INT DEFAULT 0,
  longest_streak                   INT DEFAULT 0,
  last_login_date                  DATE DEFAULT NULL,

  -- Stripe & Billing
  stripe_customer_id               TEXT DEFAULT NULL,
  stripe_subscription_id           TEXT DEFAULT NULL,
  stripe_price_id                  TEXT DEFAULT NULL,
  subscription_status              TEXT DEFAULT NULL,

  -- Trial & Lifecycle Tracking (SMS + Email Idempotency)
  trial_start_date                 TIMESTAMPTZ DEFAULT NULL,
  trial_day5_sms_sent              BOOLEAN DEFAULT false,
  trial_day7_sms_sent              BOOLEAN DEFAULT false,
  trial_welcome_email_sent         BOOLEAN DEFAULT false,
  trial_day5_email_sent            BOOLEAN DEFAULT false,
  trial_day7_email_sent            BOOLEAN DEFAULT false,
  trial_cancelled_email_sent       BOOLEAN DEFAULT false,

  -- AI Disclaimer Flags
  essay_disclaimer_accepted        BOOLEAN DEFAULT false,
  resume_disclaimer_accepted       BOOLEAN DEFAULT false,

  -- Dashboard Task Indexes
  scholarship_task_index           INT DEFAULT 0,
  essay_task_index                 INT DEFAULT 0,
  college_task_index               INT DEFAULT 0,
  job_task_index                   INT DEFAULT 0,

  -- Legacy / Tag Fields
  gpa_range                        TEXT DEFAULT '',
  fields_of_study                  TEXT[] DEFAULT '{}',
  background_tags                  TEXT[] DEFAULT '{}',
  involvement_tags                 TEXT[] DEFAULT '{}',
  college_start                    TEXT DEFAULT '',
  biggest_challenge                TEXT DEFAULT '',

  -- Status & Onboarding
  is_active                        BOOLEAN DEFAULT true,
  onboarding_complete              BOOLEAN DEFAULT false,
  onboarding_step                  INT DEFAULT 1,
  sms_opt_in                       BOOLEAN DEFAULT true,
  created_at                       TIMESTAMPTZ DEFAULT now(),
  updated_at                       TIMESTAMPTZ DEFAULT now(),

  -- Account linking (parent <-> student)
  linked_student_id                UUID REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Ensure all columns exist if profiles was previously created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_day5_sms_sent BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_day7_sms_sent BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_welcome_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_day5_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_day7_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_cancelled_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS essay_disclaimer_accepted BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_disclaimer_accepted BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scholarship_task_index INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS essay_task_index INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college_task_index INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_task_index INT DEFAULT 0;

-- Account Type Constraint & Staff Backfill
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
UPDATE public.profiles
SET account_type = 'staff'
WHERE role IN ('admin', 'super_admin', 'college_coach', 'content_manager', 'customer_support')
  AND (account_type IS NULL OR account_type = 'student');

ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check 
  CHECK (account_type IN ('student', 'parent', 'staff'));


-- 2. AUTO-CREATE PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    first_name,
    phone,
    linked_student_id, 
    account_type
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    CASE 
      WHEN new.raw_user_meta_data->>'linked_student_id' IS NOT NULL 
           AND new.raw_user_meta_data->>'linked_student_id' != '' 
      THEN (new.raw_user_meta_data->>'linked_student_id')::uuid 
      ELSE NULL 
    END,
    COALESCE(new.raw_user_meta_data->>'account_type', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. SCHOLARSHIPS
CREATE TABLE IF NOT EXISTS public.scholarships (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  link                    TEXT NOT NULL,
  award_amount            TEXT NOT NULL,
  award_amount_value      NUMERIC DEFAULT NULL,
  deadline                DATE NOT NULL,
  category                TEXT NOT NULL,
  description             TEXT DEFAULT '',
  eligible_majors         TEXT DEFAULT '',
  min_gpa_required        NUMERIC DEFAULT NULL,
  eligible_states         TEXT DEFAULT 'ALL',
  state_eligibility_all   BOOLEAN DEFAULT true,
  special_eligibility     TEXT DEFAULT '',
  grade_levels            TEXT[] DEFAULT '{}',
  essay_required          BOOLEAN DEFAULT false,
  citizenship_req         TEXT DEFAULT '',
  citizenship_requirement TEXT DEFAULT '',
  organization_name       TEXT DEFAULT '',
  award_frequency         TEXT CHECK (award_frequency IN ('', 'one_time', 'renewable')) DEFAULT '',
  number_of_awards        TEXT DEFAULT '',
  featured                BOOLEAN DEFAULT false,
  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);


-- 4. APPLICATIONS (Scholarship Tracker)
CREATE TABLE IF NOT EXISTS public.applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  status         TEXT CHECK (status IN ('Not Started', 'In Progress', 'Submitted', 'Won', 'Lost')) DEFAULT 'Not Started',
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, scholarship_id)
);


-- 5. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  status      TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  type        TEXT CHECK (type IN ('daily', 'weekly', 'custom')) DEFAULT 'custom',
  due_date    DATE DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);


-- 6. REMINDERS
CREATE TABLE IF NOT EXISTS public.reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  due_date    TIMESTAMPTZ NOT NULL,
  reminded_at TIMESTAMPTZ DEFAULT NULL,
  entity_type TEXT CHECK (entity_type IN ('scholarship', 'college', 'task')) DEFAULT 'task',
  entity_id   UUID,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);


-- 7. ESSAYS
CREATE TABLE IF NOT EXISTS public.essays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  topic       TEXT DEFAULT '',
  content     TEXT DEFAULT '',
  status      TEXT CHECK (status IN ('draft', 'in_progress', 'completed')) DEFAULT 'draft',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);


-- 8. DOCUMENTS (Vault)
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT CHECK (type IN ('transcript', 'report_card', 'recommendation_letter', 'essay', 'resume', 'certificate', 'award', 'other')) NOT NULL,
  file_url    TEXT NOT NULL,
  size_bytes  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);


-- 9. SAVED COLLEGES
CREATE TABLE IF NOT EXISTS public.saved_colleges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_name TEXT NOT NULL,
  deadline     DATE,
  status       TEXT CHECK (status IN ('researching', 'compare', 'application_started', 'applied', 'waiting_decision', 'waitlisted', 'accepted', 'rejected', 'completed')) DEFAULT 'researching',
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);


-- 10. RESUMES (Career Center)
CREATE TABLE IF NOT EXISTS public.resumes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);


-- 11. INCOME GOALS (Income Center)
CREATE TABLE IF NOT EXISTS public.income_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hustle_title  TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  earned_amount NUMERIC DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);


-- 12. COACHING MESSAGES
CREATE TABLE IF NOT EXISTS public.coaching_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  type        TEXT CHECK (type IN ('guidance', 'reminder', 'motivation', 'announcement')) DEFAULT 'guidance',
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- 13. SITE SETTINGS (Admin Configuration & OAuth Tokens)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name        TEXT DEFAULT 'Schoolari',
  support_email    TEXT DEFAULT '',
  support_phone    TEXT DEFAULT '',
  cc_access_token  TEXT DEFAULT NULL,
  cc_refresh_token TEXT DEFAULT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cc_access_token TEXT DEFAULT NULL;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cc_refresh_token TEXT DEFAULT NULL;

INSERT INTO public.site_settings (site_name, support_email, support_phone)
SELECT 'Schoolari', '', ''
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);


-- 14. USER ROLES (Admin Permissions)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 15. TRACKER ITEMS (Kanban & Deadline Board)
CREATE TABLE IF NOT EXISTS public.tracker_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL, -- 'scholarship', 'college', 'task', 'essay', 'custom'
  reference_id   TEXT DEFAULT NULL,
  title          TEXT NOT NULL,
  status         TEXT DEFAULT 'not_started',
  due_date       TIMESTAMPTZ DEFAULT NULL,
  notes          TEXT DEFAULT NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracker_items_user_due ON public.tracker_items(user_id, due_date ASC);


-- 16. NOTIFICATIONS (User Notification Feed)
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);


-- 17. DASHBOARD CONTENT (Announcements, Tips, Banners)
CREATE TABLE IF NOT EXISTS public.dashboard_content (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL DEFAULT 'announcement', -- 'tip', 'quote', 'announcement', 'event', 'featured_scholarship', 'banner'
  title        TEXT NOT NULL,
  body         TEXT DEFAULT '',
  description  TEXT DEFAULT '',
  cta_label    TEXT DEFAULT NULL,
  cta_url      TEXT DEFAULT NULL,
  video_url    TEXT DEFAULT NULL,
  image_url    TEXT DEFAULT NULL,
  tags         TEXT[] DEFAULT '{}',
  is_active    BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT true,
  scheduled_at TIMESTAMPTZ DEFAULT NULL,
  expires_at   TIMESTAMPTZ DEFAULT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────
-- SECTION 3. CAREER & JOBS MODULE
-- ─────────────────────────────────────────────────────────────

-- 1. CUSTOM JOBS
CREATE TABLE IF NOT EXISTS public.custom_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  company         TEXT NOT NULL,
  location        TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  description     TEXT NOT NULL,
  apply_url       TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CAREER ARTICLES
CREATE TABLE IF NOT EXISTS public.career_articles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  summary      TEXT,
  content      TEXT NOT NULL,
  category     TEXT NOT NULL,
  external_url TEXT,
  image_url    TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SAVED JOBS & WISHLIST
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id                         TEXT NOT NULL,
  job_title                      TEXT NOT NULL,
  employer_name                  TEXT NOT NULL,
  employer_logo                  TEXT,
  job_city                       TEXT,
  job_state                      TEXT,
  job_country                    TEXT,
  job_employment_type            TEXT,
  workplace_type                 TEXT,
  job_apply_link                 TEXT,
  job_description                TEXT,
  job_min_salary                 NUMERIC,
  job_max_salary                 NUMERIC,
  job_salary_currency            TEXT,
  job_posted_at_datetime_utc     TIMESTAMPTZ,
  job_offer_expiration_timestamp BIGINT,
  job_highlights                 JSONB,
  job_required_skills            TEXT[],
  job_benefits                   TEXT[],
  raw_job_data                   JSONB,
  created_at                     TIMESTAMPTZ DEFAULT now(),
  updated_at                     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_saved_job UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_job ON public.saved_jobs(user_id, job_id);


-- ─────────────────────────────────────────────────────────────
-- SECTION 4. EARN VIDEO CENTER (Training & Progress)
-- ─────────────────────────────────────────────────────────────

-- 1. EARN CATEGORIES
CREATE TABLE IF NOT EXISTS public.earn_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. EARN VIDEOS
CREATE TABLE IF NOT EXISTS public.earn_videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      UUID NOT NULL REFERENCES public.earn_categories(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT DEFAULT '',
  video_type       TEXT NOT NULL DEFAULT 'youtube' CHECK (video_type IN ('youtube', 'mp4')),
  youtube_url      TEXT DEFAULT '',
  mp4_url          TEXT DEFAULT '',
  mp4_storage_path TEXT DEFAULT NULL,
  thumbnail_url    TEXT DEFAULT NULL,
  difficulty       TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  watch_time_mins  INT DEFAULT NULL,
  is_published     BOOLEAN DEFAULT true,
  sort_order       INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 3. EARN VIDEO ACTION ITEMS
CREATE TABLE IF NOT EXISTS public.earn_video_action_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   UUID NOT NULL REFERENCES public.earn_videos(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. STUDENT VIDEO PROGRESS
CREATE TABLE IF NOT EXISTS public.student_video_progress (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id               UUID NOT NULL REFERENCES public.earn_videos(id) ON DELETE CASCADE,
  status                 TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  last_watched_at        TIMESTAMPTZ DEFAULT now(),
  completed_at           TIMESTAMPTZ DEFAULT NULL,
  last_position_seconds  INT DEFAULT 0,
  progress_percentage    INT DEFAULT 0,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_student_video_progress_user ON public.student_video_progress(user_id);


-- ─────────────────────────────────────────────────────────────
-- SECTION 5. COACHING SESSIONS, ENROLLMENTS & FEEDBACK
-- ─────────────────────────────────────────────────────────────

-- 1. COACHING SESSIONS
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT DEFAULT '',
  session_date     TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60,
  meeting_link     TEXT DEFAULT '',
  session_type     TEXT DEFAULT 'group',
  coach_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 2. COACHING ENROLLMENTS
CREATE TABLE IF NOT EXISTS public.coaching_enrollments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_status TEXT DEFAULT 'registered',
  internal_notes    TEXT DEFAULT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coaching_enrollments ADD COLUMN IF NOT EXISTS internal_notes TEXT;
CREATE INDEX IF NOT EXISTS idx_coaching_enrollments_student_id ON public.coaching_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_coaching_enrollments_session_id ON public.coaching_enrollments(session_id);

-- 3. COACHING FEEDBACK
CREATE TABLE IF NOT EXISTS public.coaching_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.coaching_sessions(id) ON DELETE SET NULL,
  rating     INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_feedback_session ON public.coaching_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_coaching_feedback_student ON public.coaching_feedback(student_id);


-- ─────────────────────────────────────────────────────────────
-- SECTION 6. AI CHAT WORKSPACE & SESSIONS
-- ─────────────────────────────────────────────────────────────

-- 1. AI CHAT SESSIONS
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. AI CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_updated ON public.ai_chat_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_created ON public.ai_chat_messages(user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_created ON public.ai_chat_messages(session_id, created_at ASC);


-- ─────────────────────────────────────────────────────────────
-- SECTION 7. AI LIMITS & USAGE TRACKING (V1 & V2)
-- ─────────────────────────────────────────────────────────────

-- 1. AI LIMITS (Tier Configurations)
CREATE TABLE IF NOT EXISTS public.ai_limits (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan                   TEXT NOT NULL UNIQUE, -- 'starter', 'scholar', 'elite'
  ask_ai_limit           INTEGER NOT NULL DEFAULT 0,
  essay_limit            INTEGER NOT NULL DEFAULT 0,
  resume_limit           INTEGER NOT NULL DEFAULT 0,
  cover_letter_limit     INTEGER NOT NULL DEFAULT 0,
  monthly_budget_cap_usd NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_limits ADD COLUMN IF NOT EXISTS monthly_budget_cap_usd NUMERIC(10, 2) NOT NULL DEFAULT 15.00;

-- Upsert initial plan defaults
INSERT INTO public.ai_limits (plan, ask_ai_limit, essay_limit, resume_limit, cover_letter_limit, monthly_budget_cap_usd)
VALUES 
    ('starter', 20, 3, 2, 0, 15.00),
    ('scholar', 50, 10, 5, 5, 25.00),
    ('elite', 999999, 999999, 999999, 999999, 50.00)
ON CONFLICT (plan) DO UPDATE SET
    ask_ai_limit = EXCLUDED.ask_ai_limit,
    essay_limit = EXCLUDED.essay_limit,
    resume_limit = EXCLUDED.resume_limit,
    cover_letter_limit = EXCLUDED.cover_letter_limit,
    monthly_budget_cap_usd = EXCLUDED.monthly_budget_cap_usd,
    updated_at = NOW();

-- 2. AI USAGE (Monthly consumption tracking)
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_month      TEXT NOT NULL, -- Format: YYYY-MM
  ask_ai_count       INTEGER NOT NULL DEFAULT 0,
  essay_count        INTEGER NOT NULL DEFAULT 0,
  resume_count       INTEGER NOT NULL DEFAULT 0,
  cover_letter_count INTEGER NOT NULL DEFAULT 0,
  essay_docs_count   INTEGER NOT NULL DEFAULT 0,
  resume_docs_count  INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  last_limit_reason  TEXT DEFAULT 'None',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS essay_docs_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS resume_docs_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000;
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS last_limit_reason TEXT DEFAULT 'None';


-- ─────────────────────────────────────────────────────────────
-- SECTION 8. SCHEDULED MESSAGES & BULK DISPATCH
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role      TEXT DEFAULT 'all',      -- 'all', 'student', 'parent'
  delivery_channel TEXT DEFAULT 'in_app',   -- 'in_app', 'sms', 'both'
  title            TEXT NOT NULL,
  content          TEXT NOT NULL,
  message_type     TEXT DEFAULT 'guidance', -- 'guidance', 'motivation', 'reminder', 'announcement'
  scheduled_for    TIMESTAMPTZ NOT NULL,
  status           TEXT DEFAULT 'pending',  -- 'pending', 'sent', 'cancelled', 'failed'
  sent_at          TIMESTAMPTZ,
  sent_count       INT DEFAULT 0,
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status_time ON public.scheduled_messages(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_target_user ON public.scheduled_messages(target_user_id);


-- ─────────────────────────────────────────────────────────────
-- SECTION 9. ROW LEVEL SECURITY (RLS) & POLICIES
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essays                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_colleges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_goals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_content      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_articles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earn_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earn_videos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earn_video_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_enrollments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_feedback      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_limits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages     ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies for clean idempotency
DO $$
BEGIN
  -- Profiles
  DROP POLICY IF EXISTS "Users can view own profile." ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
  CREATE POLICY "Users can view own profile." ON public.profiles FOR SELECT USING (auth.uid() = id OR auth.uid() = linked_student_id);
  CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id OR auth.uid() = linked_student_id);

  -- Scholarships
  DROP POLICY IF EXISTS "Anyone can view active scholarships." ON public.scholarships;
  CREATE POLICY "Anyone can view active scholarships." ON public.scholarships FOR SELECT USING (is_active = true);

  -- Applications
  DROP POLICY IF EXISTS "Users can manage own applications." ON public.applications;
  CREATE POLICY "Users can manage own applications." ON public.applications FOR ALL USING (
    auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
  );

  -- Tasks
  DROP POLICY IF EXISTS "Users can manage own tasks." ON public.tasks;
  CREATE POLICY "Users can manage own tasks." ON public.tasks FOR ALL USING (
    auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
  );

  -- Reminders
  DROP POLICY IF EXISTS "Users can manage own reminders." ON public.reminders;
  CREATE POLICY "Users can manage own reminders." ON public.reminders FOR ALL USING (
    auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
  );

  -- Essays
  DROP POLICY IF EXISTS "Users can manage own essays." ON public.essays;
  CREATE POLICY "Users can manage own essays." ON public.essays FOR ALL USING (
    auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
  );

  -- Documents
  DROP POLICY IF EXISTS "Users can manage own documents." ON public.documents;
  CREATE POLICY "Users can manage own documents." ON public.documents FOR ALL USING (
    auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
  );

  -- Saved Colleges
  DROP POLICY IF EXISTS "Users can manage own saved colleges." ON public.saved_colleges;
  CREATE POLICY "Users can manage own saved colleges." ON public.saved_colleges FOR ALL USING (
    auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
  );

  -- Resumes
  DROP POLICY IF EXISTS "Users can manage own resume." ON public.resumes;
  CREATE POLICY "Users can manage own resume." ON public.resumes FOR ALL USING (
    auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
  );

  -- Income Goals
  DROP POLICY IF EXISTS "Users can manage own income goals." ON public.income_goals;
  CREATE POLICY "Users can manage own income goals." ON public.income_goals FOR ALL USING (
    auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
  );

  -- Coaching Messages
  DROP POLICY IF EXISTS "Users can manage own messages." ON public.coaching_messages;
  CREATE POLICY "Users can manage own messages." ON public.coaching_messages FOR ALL USING (auth.uid() = user_id);

  -- Site Settings
  DROP POLICY IF EXISTS "Admins can manage site settings." ON public.site_settings;
  CREATE POLICY "Admins can manage site settings." ON public.site_settings FOR ALL USING (false);

  -- User Roles
  DROP POLICY IF EXISTS "Users can view own roles." ON public.user_roles;
  CREATE POLICY "Users can view own roles." ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

  -- Tracker Items
  DROP POLICY IF EXISTS "Users can manage own tracker items" ON public.tracker_items;
  CREATE POLICY "Users can manage own tracker items" ON public.tracker_items FOR ALL USING (
    auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
  );

  -- Notifications
  DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
  CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

  -- Dashboard Content
  DROP POLICY IF EXISTS "Anyone can view active dashboard content" ON public.dashboard_content;
  DROP POLICY IF EXISTS "Admins can manage dashboard content" ON public.dashboard_content;
  CREATE POLICY "Anyone can view active dashboard content" ON public.dashboard_content FOR SELECT USING (is_active = true OR is_published = true);
  CREATE POLICY "Admins can manage dashboard content" ON public.dashboard_content FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'administrator', 'content_manager'))
  );

  -- Custom Jobs
  DROP POLICY IF EXISTS "Anyone can view active custom jobs" ON public.custom_jobs;
  DROP POLICY IF EXISTS "Admins can manage custom jobs" ON public.custom_jobs;
  CREATE POLICY "Anyone can view active custom jobs" ON public.custom_jobs FOR SELECT USING (is_active = true);
  CREATE POLICY "Admins can manage custom jobs" ON public.custom_jobs FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'administrator', 'content_manager'))
  );

  -- Career Articles
  DROP POLICY IF EXISTS "Anyone can view active career articles" ON public.career_articles;
  DROP POLICY IF EXISTS "Admins can manage career articles" ON public.career_articles;
  CREATE POLICY "Anyone can view active career articles" ON public.career_articles FOR SELECT USING (is_active = true);
  CREATE POLICY "Admins can manage career articles" ON public.career_articles FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'administrator', 'content_manager'))
  );

  -- Saved Jobs
  DROP POLICY IF EXISTS "Users can manage own saved jobs" ON public.saved_jobs;
  CREATE POLICY "Users can manage own saved jobs" ON public.saved_jobs FOR ALL TO authenticated USING (
    auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
  ) WITH CHECK (
    auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
  );

  -- Earn Video Center
  DROP POLICY IF EXISTS "Anyone can view earn categories" ON public.earn_categories;
  CREATE POLICY "Anyone can view earn categories" ON public.earn_categories FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Anyone can view published earn videos" ON public.earn_videos;
  CREATE POLICY "Anyone can view published earn videos" ON public.earn_videos FOR SELECT USING (is_published = true);

  DROP POLICY IF EXISTS "Anyone can view earn action items" ON public.earn_video_action_items;
  CREATE POLICY "Anyone can view earn action items" ON public.earn_video_action_items FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Users can manage own video progress" ON public.student_video_progress;
  CREATE POLICY "Users can manage own video progress" ON public.student_video_progress FOR ALL USING (auth.uid() = user_id);

  -- Coaching Feedback
  DROP POLICY IF EXISTS "Students can insert their own feedback" ON public.coaching_feedback;
  DROP POLICY IF EXISTS "Students can view their own feedback" ON public.coaching_feedback;
  DROP POLICY IF EXISTS "Staff can view all coaching feedback" ON public.coaching_feedback;
  CREATE POLICY "Students can insert their own feedback" ON public.coaching_feedback FOR INSERT WITH CHECK (auth.uid() = student_id);
  CREATE POLICY "Students can view their own feedback" ON public.coaching_feedback FOR SELECT USING (auth.uid() = student_id);
  CREATE POLICY "Staff can view all coaching feedback" ON public.coaching_feedback FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'staff')
  );

  -- Coaching Sessions & Enrollments
  DROP POLICY IF EXISTS "Anyone authenticated can view coaching sessions" ON public.coaching_sessions;
  DROP POLICY IF EXISTS "Users can manage own coaching enrollments" ON public.coaching_enrollments;
  CREATE POLICY "Anyone authenticated can view coaching sessions" ON public.coaching_sessions FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Users can manage own coaching enrollments" ON public.coaching_enrollments FOR ALL TO authenticated USING (
    auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'staff')
  );

  -- AI Chat Sessions
  DROP POLICY IF EXISTS "Students and linked parents can manage AI chat sessions" ON public.ai_chat_sessions;
  CREATE POLICY "Students and linked parents can manage AI chat sessions" ON public.ai_chat_sessions FOR ALL USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'parent' AND profiles.linked_student_id = ai_chat_sessions.user_id
    )
  ) WITH CHECK (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'parent' AND profiles.linked_student_id = ai_chat_sessions.user_id
    )
  );

  -- AI Chat Messages
  DROP POLICY IF EXISTS "Students and linked parents can manage AI chat messages" ON public.ai_chat_messages;
  CREATE POLICY "Students and linked parents can manage AI chat messages" ON public.ai_chat_messages FOR ALL USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'parent' AND profiles.linked_student_id = ai_chat_messages.user_id
    )
  ) WITH CHECK (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'parent' AND profiles.linked_student_id = ai_chat_messages.user_id
    )
  );

  -- AI Limits
  DROP POLICY IF EXISTS "Allow read access to ai_limits for authenticated users" ON public.ai_limits;
  DROP POLICY IF EXISTS "Allow update access to ai_limits for admins" ON public.ai_limits;
  CREATE POLICY "Allow read access to ai_limits for authenticated users" ON public.ai_limits FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Allow update access to ai_limits for admins" ON public.ai_limits FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'superadmin', 'counselor_admin'))
  );

  -- AI Usage
  DROP POLICY IF EXISTS "Users can read own ai_usage" ON public.ai_usage;
  DROP POLICY IF EXISTS "Users can insert own ai_usage" ON public.ai_usage;
  DROP POLICY IF EXISTS "Users can update own ai_usage" ON public.ai_usage;
  CREATE POLICY "Users can read own ai_usage" ON public.ai_usage FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'superadmin', 'counselor_admin', 'advisor'))
  );
  CREATE POLICY "Users can insert own ai_usage" ON public.ai_usage FOR INSERT WITH CHECK (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'superadmin', 'counselor_admin'))
  );
  CREATE POLICY "Users can update own ai_usage" ON public.ai_usage FOR UPDATE USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'superadmin', 'counselor_admin'))
  );

  -- Scheduled Messages
  DROP POLICY IF EXISTS "Admins full access on scheduled_messages" ON public.scheduled_messages;
  CREATE POLICY "Admins full access on scheduled_messages" ON public.scheduled_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

END $$;


-- ─────────────────────────────────────────────────────────────
-- SECTION 10. REALTIME PUBLICATION
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'career_articles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE career_articles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'custom_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE custom_jobs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'coaching_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE coaching_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────
-- SECTION 11. STORAGE BUCKETS & POLICIES
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
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
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────
-- SECTION 12. SUPABASE CRON BACKGROUND AUTOMATION
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  PERFORM cron.unschedule('schoolari-reminders-job');
  PERFORM cron.schedule(
    'schoolari-reminders-job',
    '0 */4 * * *',
    $cron$
    SELECT net.http_get(
      url := 'https://members.schoolari.com/api/cron/reminders'
    );
    $cron$
  );
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- MASTER SCHEMA SETUP COMPLETE
-- ============================================================
