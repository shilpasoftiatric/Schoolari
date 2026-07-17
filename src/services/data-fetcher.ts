import { cache } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const getStudentDashboardData = cache(async (userId: string) => {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

  // 1. Fetch current user's profile
  const { data: userProfile } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).single();
  if (!userProfile) {
    throw new Error("Profile not found");
  }

  let studentProfile = null;
  let parentProfile = null;

  if (userProfile.account_type === 'parent') {
    parentProfile = userProfile;
    // Find linked student
    if (parentProfile.linked_student_id) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", parentProfile.linked_student_id)
        .maybeSingle();
      studentProfile = data;
    }
    if (!studentProfile) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("parent_email", user.email)
          .maybeSingle();
        studentProfile = data;
        if (studentProfile) {
          await supabaseAdmin
            .from("profiles")
            .update({ linked_student_id: studentProfile.id })
            .eq("id", userId);
        }
      }
    }
  } else {
    studentProfile = userProfile;
    // Find parent
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("linked_student_id", studentProfile.id)
      .maybeSingle();
    parentProfile = data;
  }

  const parentPaid = parentProfile?.subscription_status === 'active' || parentProfile?.subscription_status === 'trialing';
  const studentPaid = studentProfile?.subscription_status === 'active' || studentProfile?.subscription_status === 'trialing';
  const isFamilyPaid = parentPaid || studentPaid;

  const masterId = studentProfile ? studentProfile.id : userId;
  const masterProfile = studentProfile || userProfile;

  // Make sure subscription_status is set to active if family has paid
  if (masterProfile) {
    masterProfile.subscription_status = isFamilyPaid ? 'active' : null;
  }

  const [docsRes, essaysRes, collegesRes, appsRes, resumeRes] = await Promise.all([
    supabaseAdmin.from("documents").select("type, name").eq("user_id", masterId), 
    supabaseAdmin.from("essays").select("status").eq("user_id", masterId),
    supabaseAdmin.from("saved_colleges").select("status, college_name, deadline").eq("user_id", masterId),
    supabaseAdmin.from("applications").select("status, scholarships(deadline, name)").eq("user_id", masterId),
    supabaseAdmin.from("resumes").select("id").eq("user_id", masterId).maybeSingle()
  ]);

  return {
    profile: masterProfile,
    documents: docsRes.data || [],
    essays: essaysRes.data || [],
    savedColleges: collegesRes.data || [],
    applications: appsRes.data || [],
    resume: resumeRes.data || null,
    masterId
  };
});

