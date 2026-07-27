-- ============================================================
-- Schoolari v2 — COMPLETE Fresh Setup Script
-- Run this in the Supabase SQL Editor on the NEW project.
-- It is idempotent (IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                               uuid primary key references auth.users(id) on delete cascade,
  first_name                       text default '',
  phone                            text default '',
  
  -- Card 1: Parent & Student Info
  student_first_name               text default '',
  student_last_name                text default '',
  student_email                    text default '',
  student_phone                    text default '',
  parent_first_name                text default '',
  parent_last_name                 text default '',
  parent_email                     text default '',
  parent_phone                     text default '',
  high_school_name                 text default '',

  account_type     text check (account_type in ('student', 'parent')) default 'student',
  role             text check (role in ('user', 'admin')) default 'user',
  state            text default '',
  grade_level      text default '',

  -- Card 2: Academic Journey
  unweighted_gpa           text default '',
  weighted_gpa             text default '',
  expected_graduation_year text default '',
  applied_to_college       text default '',
  enrolled_in_college      text default '',
  intended_major           text[] default '{}',
  preferred_college_type   text[] default '{}',
  top_3_schools            text[] default '{}',
  sat_score_range          text default '',
  act_score_range          text default '',

  -- Card 3: Your Story
  first_generation_college_student text default '',
  military_family                  text default '',
  languages_spoken                 text[] default '{}',
  leadership_experience            text[] default '{}',
  volunteer_experience             text[] default '{}',
  extracurricular_activities       text[] default '{}',
  career_interest                  text[] default '{}',
  ethnicity                        text[] default '{}',
  gender                           text default '',

  -- Card 4: Goals
  schoolari_goals                  text[] default '{}',

  -- Extra / AI columns (added via migrations)
  career_interests                 text[] default '{}',
  school_type                      text default '',
  ethnicity_tags                   text[] default '{}',
  financial_need                   text default '',
  dashboard_priorities             text[] default '{}',
  ai_dashboard_data                jsonb default null,
  college_recommendations_cache    jsonb default null,

  -- Streak tracking
  current_streak                   int default 0,
  longest_streak                   int default 0,
  last_login_date                  date default null,

  -- Stripe
  stripe_customer_id               text default null,
  stripe_subscription_id           text default null,
  stripe_price_id                  text default null,
  subscription_status              text default null,

  -- Legacy / Deprecated fields
  gpa_range         text default '',
  fields_of_study   text[] default '{}',
  background_tags   text[] default '{}',
  involvement_tags  text[] default '{}',
  college_start     text default '',
  biggest_challenge text default '',

  onboarding_complete boolean default false,
  onboarding_step     int default 1,
  sms_opt_in          boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),

  -- Account linking (parent <-> student)
  linked_student_id uuid references public.profiles(id) on delete cascade
);

-- ─────────────────────────────────────────────────────────────
-- 2. AUTO-CREATE PROFILE TRIGGER
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, linked_student_id, account_type)
  values (
    new.id,
    (new.raw_user_meta_data->>'linked_student_id')::uuid,
    coalesce(new.raw_user_meta_data->>'account_type', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 3. SCHOLARSHIPS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.scholarships (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  link                  text not null,
  award_amount          text not null,
  award_amount_value    numeric default null,
  deadline              date not null,
  category              text not null,
  description           text default '',
  eligible_majors       text default '',
  min_gpa_required      numeric default null,
  eligible_states       text default 'ALL',
  state_eligibility_all boolean default true,       -- from old DB
  special_eligibility   text default '',
  grade_levels          text[] default '{}',
  essay_required        boolean default false,
  citizenship_req       text default '',
  citizenship_requirement text default '',          -- from old DB (alias column)
  organization_name     text default '',
  award_frequency       text check (award_frequency in ('', 'one_time', 'renewable')) default '',
  number_of_awards      text default '',
  featured              boolean default false,
  is_active             boolean default true,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 4. APPLICATIONS (Scholarship Tracker)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.applications (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  status         text check (status in ('Not Started', 'In Progress', 'Submitted', 'Won', 'Lost')) default 'Not Started',
  notes          text default '',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (user_id, scholarship_id)
);

-- ─────────────────────────────────────────────────────────────
-- 5. TASKS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text default '',
  status      text check (status in ('pending', 'completed')) default 'pending',
  type        text check (type in ('daily', 'weekly', 'custom')) default 'custom',
  due_date    date default null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 6. REMINDERS (CRON + Calendar)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reminders (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  due_date    timestamptz not null,
  reminded_at timestamptz default null,
  entity_type text check (entity_type in ('scholarship', 'college', 'task')) default 'task',
  entity_id   uuid,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 7. ESSAYS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.essays (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  topic       text default '',
  content     text default '',
  status      text check (status in ('draft', 'in_progress', 'completed')) default 'draft',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 8. DOCUMENTS (Vault)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  type        text check (type in ('transcript', 'report_card', 'recommendation_letter', 'essay', 'resume', 'certificate', 'award', 'other')) not null,
  file_url    text not null,
  size_bytes  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 9. SAVED COLLEGES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.saved_colleges (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  college_name text not null,
  deadline     date,
  status       text check (status in ('researching', 'compare', 'application_started', 'applied', 'waiting_decision', 'waitlisted', 'accepted', 'rejected', 'completed')) default 'researching',
  notes        text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 10. RESUMES (Career Center)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.resumes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     jsonb default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id)
);

-- ─────────────────────────────────────────────────────────────
-- 11. INCOME GOALS (Income Center)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.income_goals (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  hustle_title  text not null,
  target_amount numeric not null,
  earned_amount numeric default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 12. COACHING MESSAGES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.coaching_messages (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  content     text not null,
  type        text check (type in ('guidance', 'reminder', 'motivation', 'announcement')) default 'guidance',
  is_read     boolean default false,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 13. SITE SETTINGS (Admin)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.site_settings (
  id            uuid primary key default uuid_generate_v4(),
  site_name     text default 'Schoolari',
  support_email text default '',
  support_phone text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Insert a default row so settings always exist
insert into public.site_settings (site_name, support_email, support_phone)
select 'Schoolari', '', ''
where not exists (select 1 from public.site_settings);

-- ─────────────────────────────────────────────────────────────
-- 14. USER ROLES (Admin permissions)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.user_roles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 15. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.scholarships      enable row level security;
alter table public.applications      enable row level security;
alter table public.tasks             enable row level security;
alter table public.reminders         enable row level security;
alter table public.essays            enable row level security;
alter table public.documents         enable row level security;
alter table public.saved_colleges    enable row level security;
alter table public.resumes           enable row level security;
alter table public.income_goals      enable row level security;
alter table public.coaching_messages enable row level security;
alter table public.site_settings     enable row level security;
alter table public.user_roles        enable row level security;

-- Drop any existing policies (safe to re-run)
drop policy if exists "Users can view own profile."          on public.profiles;
drop policy if exists "Users can update own profile."        on public.profiles;
drop policy if exists "Users can manage own applications."   on public.applications;
drop policy if exists "Users can manage own tasks."          on public.tasks;
drop policy if exists "Users can manage own reminders."      on public.reminders;
drop policy if exists "Users can manage own essays."         on public.essays;
drop policy if exists "Users can manage own documents."      on public.documents;
drop policy if exists "Users can manage own saved colleges." on public.saved_colleges;
drop policy if exists "Users can manage own resume."         on public.resumes;
drop policy if exists "Users can manage own income goals."   on public.income_goals;
drop policy if exists "Users can manage own messages."       on public.coaching_messages;
drop policy if exists "Anyone can view active scholarships." on public.scholarships;
drop policy if exists "Admins can manage site settings."     on public.site_settings;
drop policy if exists "Users can view own roles."            on public.user_roles;

-- Profiles
create policy "Users can view own profile."
  on public.profiles for select
  using (auth.uid() = id or auth.uid() = linked_student_id);

create policy "Users can update own profile."
  on public.profiles for update
  using (auth.uid() = id or auth.uid() = linked_student_id);

-- Scholarships: public read, writes handled via service role key in admin
create policy "Anyone can view active scholarships."
  on public.scholarships for select
  using (is_active = true);

-- Applications
create policy "Users can manage own applications."
  on public.applications for all
  using (
    auth.uid() = user_id
    or auth.uid() = (select linked_student_id from public.profiles where id = auth.uid())
  );

-- Tasks
create policy "Users can manage own tasks."
  on public.tasks for all
  using (
    auth.uid() = user_id
    or auth.uid() = (select linked_student_id from public.profiles where id = auth.uid())
  );

-- Reminders
create policy "Users can manage own reminders."
  on public.reminders for all
  using (
    auth.uid() = user_id
    or auth.uid() = (select linked_student_id from public.profiles where id = auth.uid())
  );

-- Essays
create policy "Users can manage own essays."
  on public.essays for all
  using (
    auth.uid() = user_id
    or auth.uid() = (select linked_student_id from public.profiles where id = auth.uid())
  );

-- Documents
create policy "Users can manage own documents."
  on public.documents for all
  using (
    auth.uid() = user_id
    or auth.uid() = (select linked_student_id from public.profiles where id = auth.uid())
  );

-- Saved Colleges
create policy "Users can manage own saved colleges."
  on public.saved_colleges for all
  using (
    auth.uid() = user_id
    or auth.uid() = (select linked_student_id from public.profiles where id = auth.uid())
  );

-- Resumes
create policy "Users can manage own resume."
  on public.resumes for all
  using (
    auth.uid() = user_id
    or auth.uid() = (select linked_student_id from public.profiles where id = auth.uid())
  );

-- Income Goals
create policy "Users can manage own income goals."
  on public.income_goals for all
  using (
    auth.uid() = user_id
    or auth.uid() = (select linked_student_id from public.profiles where id = auth.uid())
  );

-- Coaching Messages
create policy "Users can manage own messages."
  on public.coaching_messages for all
  using (auth.uid() = user_id);

-- Site Settings: service role only (admin panel uses service role key)
create policy "Admins can manage site settings."
  on public.site_settings for all
  using (false); -- blocks all anon/user access; only service_role key bypasses RLS

-- User Roles
create policy "Users can view own roles."
  on public.user_roles for select
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 16. STORAGE BUCKETS
-- Run these in the SQL editor as-is.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('vault', 'vault', true)
on conflict (id) do nothing;

-- Storage RLS
drop policy if exists "Users can upload their own files" on storage.objects;
drop policy if exists "Public can view documents"        on storage.objects;
drop policy if exists "Users can delete own files"       on storage.objects;

create policy "Users can upload their own files"
  on storage.objects for insert
  with check (bucket_id in ('documents', 'vault') and auth.role() = 'authenticated');

create policy "Public can view documents"
  on storage.objects for select
  using (bucket_id in ('documents', 'vault'));

create policy "Users can delete own files"
  on storage.objects for delete
  using (bucket_id in ('documents', 'vault') and auth.uid()::text = (storage.foldername(name))[1]);

-- ─────────────────────────────────────────────────────────────
-- DONE — All tables, RLS policies, triggers, and storage buckets
-- are now set up. Update .env.local with the new project keys.
-- ─────────────────────────────────────────────────────────────
