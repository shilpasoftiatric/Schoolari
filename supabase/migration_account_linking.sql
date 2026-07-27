-- 1. Add linked_student_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linked_student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Update Auto-create profile trigger to handle linked accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, linked_student_id, account_type)
  VALUES (
    new.id,
    (new.raw_user_meta_data->>'linked_student_id')::uuid,
    COALESCE(new.raw_user_meta_data->>'account_type', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

CREATE POLICY "Users can view own profile." ON public.profiles FOR SELECT USING (auth.uid() = id OR auth.uid() = linked_student_id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id OR auth.uid() = linked_student_id);

-- 4. Update Applications Policies
DROP POLICY IF EXISTS "Users can manage own applications." ON public.applications;
CREATE POLICY "Users can manage own applications." ON public.applications FOR ALL USING (auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid()));

-- 5. Update Tasks Policies
DROP POLICY IF EXISTS "Users can manage own tasks." ON public.tasks;
CREATE POLICY "Users can manage own tasks." ON public.tasks FOR ALL USING (auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid()));

-- 6. Update Essays Policies
DROP POLICY IF EXISTS "Users can manage own essays." ON public.essays;
CREATE POLICY "Users can manage own essays." ON public.essays FOR ALL USING (auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid()));

-- 7. Update Documents Policies
DROP POLICY IF EXISTS "Users can manage own documents." ON public.documents;
CREATE POLICY "Users can manage own documents." ON public.documents FOR ALL USING (auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid()));

-- 8. Update Saved Colleges Policies
DROP POLICY IF EXISTS "Users can manage own saved colleges." ON public.saved_colleges;
CREATE POLICY "Users can manage own saved colleges." ON public.saved_colleges FOR ALL USING (auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid()));

-- 9. Update Resumes Policies
DROP POLICY IF EXISTS "Users can manage own resume." ON public.resumes;
CREATE POLICY "Users can manage own resume." ON public.resumes FOR ALL USING (auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid()));

-- 10. Update Income Goals Policies
DROP POLICY IF EXISTS "Users can manage own income goals." ON public.income_goals;
CREATE POLICY "Users can manage own income goals." ON public.income_goals FOR ALL USING (auth.uid() = user_id OR auth.uid() = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid()));
