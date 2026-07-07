-- ============================================================
-- Schoolari v2 — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  first_name      text default '',
  phone           text default '',
  account_type    text check (account_type in ('student', 'parent')) default 'student',
  role            text check (role in ('user', 'admin')) default 'user',
  state           text default '',
  grade_level     text default '',
  gpa_range       text default '',
  fields_of_study text[] default '{}',
  background_tags text[] default '{}',
  involvement_tags text[] default '{}',
  college_start   text default '',
  biggest_challenge text default '',
  onboarding_complete boolean default false,
  onboarding_step int default 1,
  sms_opt_in      boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- SCHOLARSHIPS
-- ─────────────────────────────────────────
create table public.scholarships (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  link                text not null,
  award_amount        text not null,
  award_amount_value  numeric default null,
  deadline            date not null,
  category            text not null,
  description         text default '',
  eligible_majors     text default '',
  min_gpa_required    numeric default null,
  eligible_states     text default 'ALL',
  special_eligibility text default '',
  grade_levels        text[] default '{}',
  essay_required      boolean default false,
  citizenship_req     text default '',
  organization_name   text default '',
  award_frequency     text check (award_frequency in ('', 'one_time', 'renewable')) default '',
  number_of_awards    text default '',
  featured            boolean default false,
  is_active           boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ─────────────────────────────────────────
-- APPLICATIONS (Scholarship Tracker)
-- ─────────────────────────────────────────
create table public.applications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  scholarship_id  uuid not null references public.scholarships(id) on delete cascade,
  status          text check (status in ('Not Started', 'In Progress', 'Submitted', 'Won', 'Lost')) default 'Not Started',
  notes           text default '',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, scholarship_id)
);

-- ─────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────
create table public.tasks (
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

-- ─────────────────────────────────────────
-- ESSAYS
-- ─────────────────────────────────────────
create table public.essays (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  topic       text default '',
  content     text default '',
  status      text check (status in ('draft', 'in_progress', 'completed')) default 'draft',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- DOCUMENTS (Vault)
-- ─────────────────────────────────────────
create table public.documents (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  type        text check (type in ('transcript', 'report_card', 'recommendation_letter', 'essay', 'resume', 'certificate', 'award', 'other')) not null,
  file_url    text not null,
  size_bytes  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access their own data
-- ─────────────────────────────────────────

alter table public.profiles    enable row level security;
alter table public.applications enable row level security;
alter table public.tasks        enable row level security;
alter table public.essays       enable row level security;
alter table public.documents    enable row level security;
alter table public.scholarships enable row level security;

-- Profiles: user can read/update their own
create policy "Users can view own profile."   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Applications: user can CRUD their own
create policy "Users can manage own applications." on public.applications for all using (auth.uid() = user_id);

-- Tasks: user can CRUD their own
create policy "Users can manage own tasks." on public.tasks for all using (auth.uid() = user_id);

-- Essays: user can CRUD their own
create policy "Users can manage own essays." on public.essays for all using (auth.uid() = user_id);

-- Documents: user can CRUD their own
create policy "Users can manage own documents." on public.documents for all using (auth.uid() = user_id);

-- Scholarships: everyone can read, only admins can write (handled via service role key)
create policy "Anyone can view active scholarships." on public.scholarships for select using (is_active = true);

-- ─────────────────────────────────────────
-- PHASE 1: ADDITIONAL MODULES (Colleges, Career, Income, Coaching)
-- ─────────────────────────────────────────

-- 1. SAVED COLLEGES
create table public.saved_colleges (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  college_name  text not null,
  deadline      date,
  status        text check (status in ('researching', 'applied', 'waitlisted', 'accepted', 'rejected')) default 'researching',
  notes         text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.saved_colleges enable row level security;
create policy "Users can manage own saved colleges." on public.saved_colleges for all using (auth.uid() = user_id);

-- 2. RESUMES (Career Center)
-- Note: 'career_interests' must be added to profiles if it doesn't exist.
alter table public.profiles add column if not exists career_interests text[] default '{}';

create table public.resumes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     jsonb default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id)
);

alter table public.resumes enable row level security;
create policy "Users can manage own resume." on public.resumes for all using (auth.uid() = user_id);

-- 3. INCOME GOALS (Income Center)
create table public.income_goals (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  hustle_title  text not null,
  target_amount numeric not null,
  earned_amount numeric default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.income_goals enable row level security;
create policy "Users can manage own income goals." on public.income_goals for all using (auth.uid() = user_id);

-- 4. COACHING MESSAGES (Coaching Center)
create table public.coaching_messages (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  content     text not null,
  type        text check (type in ('guidance', 'reminder', 'motivation', 'announcement')) default 'guidance',
  is_read     boolean default false,
  created_at  timestamptz default now()
);

alter table public.coaching_messages enable row level security;
create policy "Users can manage own messages." on public.coaching_messages for all using (auth.uid() = user_id);
