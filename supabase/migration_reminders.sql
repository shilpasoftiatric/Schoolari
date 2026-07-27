-- Create Reminders Table
CREATE TABLE IF NOT EXISTS public.reminders (
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

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can manage own reminders." ON public.reminders FOR ALL USING (auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid()));
