"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const phone = formData.get("phone") as string;
  const accountType = (formData.get("account_type") as string) || "student";

  const supabaseAdmin = await createAdminClient();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      phone,
      account_type: accountType,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Update the profile with extra fields
  if (data.user) {
    await supabaseAdmin
      .from("profiles")
      .update({ phone, account_type: accountType as "student" | "parent" })
      .eq("id", data.user.id);
  }

  return { success: true, redirectUrl: "/login" };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const isAdminLogin = formData.get("isAdminLogin") === "true";

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    // If this is an admin login attempt, verify their role
    if (isAdminLogin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "admin") {
        // Not an admin, sign them out and throw error
        await supabase.auth.signOut();
        return { error: "Access denied. You do not have administrator privileges." };
      }

      redirect("/admin/dashboard");
    }

    // Daily Login Streak Logic for normal users
    if (!isAdminLogin) {
      const todayUtc = new Date().toISOString().split("T")[0];
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak, last_login_date")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        let { current_streak = 0, longest_streak = 0, last_login_date } = profile;
        // Default to 0 if null
        current_streak = current_streak || 0;
        longest_streak = longest_streak || 0;

        if (last_login_date !== todayUtc) {
          const yesterday = new Date();
          yesterday.setUTCDate(yesterday.getUTCDate() - 1);
          const yesterdayUtc = yesterday.toISOString().split("T")[0];

          if (last_login_date === yesterdayUtc) {
            current_streak += 1;
          } else {
            current_streak = 1; // Reset streak if missed a day, or first login
          }

          if (current_streak > longest_streak) {
            longest_streak = current_streak;
          }

          // Update the database
          await supabase.from("profiles").update({
            current_streak,
            longest_streak,
            last_login_date: todayUtc
          }).eq("id", data.user.id);
        }
      }
    }
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Called when an invited user sets their password for the first time.
 * This heals the profile by determining whether this user was invited as a
 * student (by a parent) or as a parent (by a student), then correctly sets
 * account_type and ensures the two-way link exists.
 * 
 * Returns the correct redirect path for the user.
 */
export async function healInvitedUserProfile(): Promise<{ redirectTo: string }> {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { redirectTo: "/login" };

  // --- CASE 1: Was this user invited as a STUDENT by a paying parent? ---
  // A parent invited them: parent profile has `linked_student_id = user.id`
  const { data: invitingParent } = await supabaseAdmin
    .from("profiles")
    .select("id, subscription_status")
    .eq("linked_student_id", user.id)
    .maybeSingle();

  if (invitingParent) {
    // This user is the student. Fix their account_type.
    await supabaseAdmin
      .from("profiles")
      .update({ account_type: "student" })
      .eq("id", user.id);

    const parentHasPaid =
      invitingParent.subscription_status === "active" ||
      invitingParent.subscription_status === "trialing";

    if (!parentHasPaid) {
      return { redirectTo: "/pricing" };
    }
    
    // Check if student profile is already onboarding complete
    const { data: currentStudent } = await supabaseAdmin
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .single();
      
    if (currentStudent?.onboarding_complete) {
      return { redirectTo: "/dashboard" };
    }
    
    return { redirectTo: "/onboarding" };
  }

  // --- CASE 2: Was this user invited as a PARENT by a paying student? ---
  // The student recorded this user's email in `parent_email` on their profile.
  const { data: invitingStudentProfile } = user.email ? await supabaseAdmin
    .from("profiles")
    .select("id, subscription_status, onboarding_complete")
    .eq("parent_email", user.email)
    .maybeSingle() : { data: null };

  if (invitingStudentProfile) {
    // This user is the parent. Fix their profile.
    await supabaseAdmin
      .from("profiles")
      .update({
        account_type: "parent",
        linked_student_id: invitingStudentProfile.id,
      })
      .eq("id", user.id);

    const studentHasPaid =
      invitingStudentProfile.subscription_status === "active" ||
      invitingStudentProfile.subscription_status === "trialing";

    if (!studentHasPaid) {
      return { redirectTo: "/pricing" };
    }
    
    if (invitingStudentProfile.onboarding_complete) {
      return { redirectTo: "/dashboard" };
    }
    
    return { redirectTo: "/onboarding" };
  }

  // --- CASE 3: Fresh signup (not an invite) → normal flow ---
  return { redirectTo: "/dashboard" };
}
