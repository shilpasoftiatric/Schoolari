import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getStudentDashboardData = cache(async (userId: string) => {
  const supabase = await createClient();

  const [profileRes, docsRes, essaysRes, collegesRes, appsRes, resumeRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("documents").select("type, name").eq("user_id", userId), // included 'name' for transcript detection logic in state-engine
    supabase.from("essays").select("status").eq("user_id", userId),
    supabase.from("saved_colleges").select("status, college_name, deadline").eq("user_id", userId),
    supabase.from("applications").select("status, scholarships(deadline, name)").eq("user_id", userId),
    supabase.from("resumes").select("*").eq("user_id", userId).maybeSingle()
  ]);

  return {
    profile: profileRes.data,
    documents: docsRes.data || [],
    essays: essaysRes.data || [],
    savedColleges: collegesRes.data || [],
    applications: appsRes.data || [],
    resume: resumeRes.data || null
  };
});
