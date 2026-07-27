import { cache } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const getStudentDashboardData = cache(async (userId: string) => {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

  // 1. Fetch current user's profile
  let { data: userProfile } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();

  // Self-healing: if auth user exists but profile row is missing, create a default profile automatically
  if (!userProfile) {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (user) {
      const email = user.email || "";
      const defaultProfile = {
        id: userId,
        email: email,
        student_first_name: user.user_metadata?.first_name || email.split("@")[0] || "Student",
        student_last_name: user.user_metadata?.last_name || "",
        grade_level: "11th Grade (Junior)",
        account_type: (user.user_metadata?.account_type as "student" | "parent") || "student",
        subscription_status: "active"
      };
      const { data: createdProfile } = await supabaseAdmin.from("profiles").insert(defaultProfile).select("*").maybeSingle();
      userProfile = createdProfile || defaultProfile;
    }
  }

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

  const [docsRes, essaysRes, collegesRes, appsRes, resumeRes, trackerRes] = await Promise.all([
    supabaseAdmin.from("documents").select("type, name").eq("user_id", masterId),
    supabaseAdmin.from("essays").select("status").eq("user_id", masterId),
    supabaseAdmin.from("saved_colleges").select("status, college_name, deadline").eq("user_id", masterId),
    supabaseAdmin.from("applications").select("status, scholarships(deadline, name)").eq("user_id", masterId),
    supabaseAdmin.from("resumes").select("id").eq("user_id", masterId).maybeSingle(),
    supabaseAdmin.from("tracker_items").select("*").eq("user_id", masterId).order("due_date", { ascending: true })
  ]);

  // Global Dashboard Tasks
  const { data: globalTasks } = await supabaseAdmin.from("tasks").select("*").eq("user_id", masterId).order("created_at", { ascending: false });

  return {
    profile: masterProfile,
    userProfile: userProfile,
    documents: docsRes.data || [],
    essays: essaysRes.data || [],
    savedColleges: collegesRes.data || [],
    applications: appsRes.data || [],
    resume: resumeRes.data || null,
    trackerItems: trackerRes.data || [],
    globalTasks: globalTasks || [],
    masterId
  };
});

