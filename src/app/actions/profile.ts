"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatPhoneE164 } from "@/lib/phone";
import { redirect } from "next/navigation";
import { syncOnboardingContacts, syncContact, CONSTANT_CONTACT_PARENT_LIST, CONSTANT_CONTACT_STUDENT_LIST } from "@/lib/constant-contact";
import { sendWelcomeSMS } from "@/lib/twilio";
import { sendInviteEmail, sendWelcomeEmail, sendTrialWelcomeEmail } from "@/lib/email";

// Hardcoded fallback to members.localhost:3000 to match Supabase Site URL
const APP_URL = process.env.NODE_ENV === 'production' ? "https://members.schoolari.com" : "http://members.localhost:3000";

export async function saveOnboardingStep(step: number, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const payload: any = { onboarding_step: step };
  if (data.onboarding_complete) payload.onboarding_complete = true;

  const allowedKeys = [
    'student_first_name', 'student_last_name', 'student_email', 'student_phone',
    'parent_first_name', 'parent_last_name', 'parent_email', 'parent_phone',
    'high_school_name', 'unweighted_gpa', 'weighted_gpa', 'expected_graduation_year',
    'applied_to_college', 'enrolled_in_college', 'intended_major', 'preferred_college_type',
    'top_3_schools', 'sat_score_range', 'act_score_range',
    'first_generation_college_student', 'military_family', 'languages_spoken',
    'leadership_experience', 'volunteer_experience', 'extracurricular_activities',
    'ethnicity', 'gender', 'schoolari_goals',
    'state', 'grade_level', 'fields_of_study',
    'background_tags', 'involvement_tags', 'college_start', 'biggest_challenge',
    'ethnicity_tags', 'financial_need',
    'account_type', 'career_interest'
  ];

  allowedKeys.forEach(key => {
    if (data[key] !== undefined) {
      // Format phone numbers to E.164
      if (key === 'student_phone' || key === 'parent_phone') {
        payload[key] = formatPhoneE164(data[key]);
      } else {
        payload[key] = data[key];
      }
    }
  });

  // Determine which profile to update
  let targetId = user.id;
  const supabaseAdmin = await createAdminClient();
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("account_type, linked_student_id")
    .eq("id", user.id)
    .single();

  const isCurrentUserStudent = currentUserProfile?.account_type === 'student';

  if (!isCurrentUserStudent) {
    if (currentUserProfile?.linked_student_id) {
      targetId = currentUserProfile.linked_student_id;
    } else if (step === 2 && data.student_email) {
      const { data: existingStudent } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("student_email", data.student_email)
        .maybeSingle();

      if (existingStudent) {
        targetId = existingStudent.id;
        await supabaseAdmin.from("profiles").update({ linked_student_id: targetId }).eq("id", user.id);
      } else {
        const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: data.student_email,
          options: {
            data: {
              account_type: 'student',
              linked_student_id: null,
            },
            redirectTo: `${APP_URL}/members/update-password`
          }
        });

        let finalInviteLink = `${APP_URL}/signup?invited=true&email=${encodeURIComponent(data.student_email)}`;

        if (createError) {
          if (data.student_email === user.email) {
            return { error: "You cannot use the same email for both parent and student. Please provide the student's unique email." };
          }
          if (createError.message.includes("already registered")) {
            console.log("Student account already exists, generating recovery link instead.");
            const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email: data.student_email,
              options: {
                redirectTo: `${APP_URL}/members/update-password`
              }
            });
            
            if (!recoveryError && recoveryData?.properties?.action_link) {
              finalInviteLink = recoveryData.properties.action_link;
            }
            
            // We need to look up the existing student's ID to link them
            const { data: existingStudent } = await supabaseAdmin.auth.admin.getUserById(data.student_email);
            // We can't lookup by email with getUserById easily, we have to query the profiles table or just assume they will link later when they log in.
            // Actually, we can just send the email and return success.
          } else {
            return { error: "The student email you provided is already registered. Please use a different email or have the student log in first." };
          }
        }

        if (newAuthUser?.user) {
          targetId = newAuthUser.user.id;
          await supabaseAdmin.from("profiles").update({ linked_student_id: targetId }).eq("id", user.id);
          finalInviteLink = newAuthUser.properties?.action_link || finalInviteLink;
        }
        sendInviteEmail(data.student_email, data.student_first_name || "", data.parent_first_name || "", finalInviteLink, "student").catch(e => console.error("Invite email failed", e));
      }

      // Mirror Stripe data to the newly linked student (whether newly invited or previously existing)
      if (targetId !== user.id) {
        const { data: parentStripe } = await supabaseAdmin
          .from("profiles")
          .select("stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status")
          .eq("id", user.id)
          .single();

        if (parentStripe?.subscription_status === 'active' || parentStripe?.subscription_status === 'trialing') {
          await supabaseAdmin
            .from("profiles")
            .update({
              stripe_customer_id: parentStripe.stripe_customer_id,
              stripe_subscription_id: parentStripe.stripe_subscription_id,
              stripe_price_id: parentStripe.stripe_price_id,
              subscription_status: parentStripe.subscription_status
            })
            .eq("id", targetId);
        }
      }
    }
  }

  // If the parent skipped to the end, they should be marked as complete but the student should NOT be.
  if (data.parent_skipped_to_end) {
    const { error: skipError } = await supabaseAdmin
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", user.id);
    
    if (skipError) {
      return { error: skipError.message };
    }
    return { data: { parent_skipped: true } };
  }

  const { error, data: updatedProfile } = await supabaseAdmin
    .from("profiles")
    .update(payload)
    .eq("id", targetId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Trigger integrations when moving past Step 1
  if (step === 2 && updatedProfile) {
    // 1. Sync Constant Contact — Student/Parent general marketing lists (fire and forget)
    syncOnboardingContacts(
      updatedProfile.student_email || "", updatedProfile.student_first_name || "", updatedProfile.student_last_name || "",
      updatedProfile.parent_email || "", updatedProfile.parent_first_name || "", updatedProfile.parent_last_name || ""
    ).catch(console.error);

    // 2. Send SMS, Welcome Email, and Family Account Invite
    try {
      const studentEmail = updatedProfile.student_email;
      const studentPhone = updatedProfile.student_phone;
      const studentFirstName = updatedProfile.student_first_name;

      const parentEmail = updatedProfile.parent_email;
      const parentPhone = updatedProfile.parent_phone;
      const parentFirstName = updatedProfile.parent_first_name;

      const formattedStudentPhone = studentPhone ? formatPhoneE164(studentPhone) : null;
      const formattedParentPhone = parentPhone ? formatPhoneE164(parentPhone) : null;

      if (formattedStudentPhone) {
        await sendWelcomeSMS(formattedStudentPhone, 'student', isCurrentUserStudent).catch(console.error);
      }

      if (formattedParentPhone && formattedParentPhone !== formattedStudentPhone) {
        await sendWelcomeSMS(formattedParentPhone, 'parent', !isCurrentUserStudent).catch(console.error);
      }

      // Check if subscriber is on a trial
      const isTrialing = updatedProfile.subscription_status === "trialing";

      // Send Welcome Email to the person who signed up (using Google Workspace via students@schoolari.com)
      if (isCurrentUserStudent && studentEmail) {
        if (isTrialing) {
          await sendTrialWelcomeEmail(studentEmail, studentFirstName || "Student").catch(console.error);
          await supabaseAdmin.from("profiles").update({ trial_welcome_email_sent: true }).eq("id", targetId);
        } else {
          await sendWelcomeEmail(studentEmail, studentFirstName || "there", "student").catch(console.error);
        }
      } else if (!isCurrentUserStudent && parentEmail) {
        if (isTrialing) {
          await sendTrialWelcomeEmail(parentEmail, parentFirstName || "there").catch(console.error);
          await supabaseAdmin.from("profiles").update({ trial_welcome_email_sent: true }).eq("id", user.id);
        } else {
          await sendWelcomeEmail(parentEmail, parentFirstName || "there", "parent").catch(console.error);
        }
      }

      // If current user is student, create parent account if it doesn't exist
      if (isCurrentUserStudent && parentEmail) {
        const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: parentEmail,
          options: {
            data: {
              account_type: "parent",
              linked_student_id: targetId,
            },
            redirectTo: `${APP_URL}/members/update-password`
          }
        });

        console.log("GENERATING LINK FOR PARENT", { APP_URL, envUrl: process.env.NEXT_PUBLIC_APP_URL, redirectTo: `${APP_URL}/members/update-password` });

        let finalInviteLink = `${APP_URL}/signup?invited=true&email=${encodeURIComponent(parentEmail)}`;

        if (createError && createError.message.includes("already registered")) {
          console.log("Parent account already exists, generating recovery link instead.");
          const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: parentEmail,
            options: {
              redirectTo: `${APP_URL}/members/update-password`
            }
          });
          
          if (!recoveryError && recoveryData?.properties?.action_link) {
            finalInviteLink = recoveryData.properties.action_link;
          }
        } else if (newAuthUser?.user) {
          finalInviteLink = newAuthUser.properties?.action_link || finalInviteLink;
        } else if (createError) {
          console.error("Error creating parent account link:", createError.message);
        }

        sendInviteEmail(parentEmail, parentFirstName || "", studentFirstName || "", finalInviteLink, "parent").catch(e => console.error("Invite email failed", e));
      }
    } catch (e) {
      console.error("Error setting up secondary account during onboarding", e);
    }
  }

  // ── Seed top_3_schools into saved_colleges on onboarding completion ──
  if (payload.onboarding_complete && updatedProfile) {
    const schools: string[] = (updatedProfile.top_3_schools || []).filter(Boolean);
    if (schools.length > 0) {
      try {
        // Fetch existing college names to avoid duplicates
        const { data: existing } = await supabaseAdmin
          .from("saved_colleges")
          .select("college_name")
          .eq("user_id", targetId);

        const existingNames = new Set(
          (existing || []).map((c: any) => c.college_name.toLowerCase())
        );

        const toInsert = schools
          .filter((name) => !existingNames.has(name.toLowerCase()))
          .map((name) => ({
            user_id: targetId,
            college_name: name,
            status: "researching",
            deadline: null,
          }));

        if (toInsert.length > 0) {
          await supabaseAdmin.from("saved_colleges").insert(toInsert);
        }
      } catch (seedErr) {
        console.error("[Onboarding] Failed to seed top_3_schools into saved_colleges:", seedErr);
      }
    }
  }

  return { success: true };
}

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const supabaseAdmin = await createAdminClient();

  // Fetch the current user's profile
  let { data } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // If user is a parent and linked to a student, merge in student's onboarding data
  if (data?.account_type === 'parent' && data?.linked_student_id) {
    const { data: studentData } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.linked_student_id)
      .single();

    if (studentData) {
      // Keep the parent's actual ID and account_type but merge in student's onboarding data
      data = { ...studentData, id: data.id, account_type: 'parent' };
    }
  }

  if (data) {
    if (data.account_type === 'student') {
      if (!data.student_email) data.student_email = user.email || "";
      if (!data.student_phone) data.student_phone = user.user_metadata?.phone || user.phone || data.phone || "";
      
      // If student is not onboarding complete, enforce the required steps
      if (!data.onboarding_complete) {
        if (!data.student_first_name || !data.student_last_name || !data.student_email || !data.student_phone || !data.grade_level || !data.high_school_name || !data.state) {
          data.onboarding_step = 1;
        } else if (!data.unweighted_gpa || !data.expected_graduation_year) {
          data.onboarding_step = 2;
        } else if (!data.schoolari_goals || data.schoolari_goals.length === 0) {
          data.onboarding_step = 4;
        }
      }
    }
    if (data.account_type === 'parent') {
      if (!data.parent_email) data.parent_email = user.email || "";
      if (!data.parent_phone) data.parent_phone = user.user_metadata?.phone || user.phone || data.phone || "";
    }
  }

  return data;
}

import { clearJobsCache } from "@/app/actions/career";

export async function updateProfile(updates: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Determine which profile to update (Student Master Profile)
  let targetId = user.id;
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("account_type, linked_student_id, unweighted_gpa, intended_major, state, preferred_college_type, career_interest, schoolari_goals, grade_level, student_first_name, student_last_name, student_email, student_phone")
    .eq("id", user.id)
    .single();

  if (currentUserProfile?.account_type === 'parent' && currentUserProfile?.linked_student_id) {
    targetId = currentUserProfile.linked_student_id;
  }

  const safeUpdates: any = { updated_at: new Date().toISOString() };

  const allowedKeys = [
    'student_first_name', 'student_last_name', 'student_email', 'student_phone',
    'parent_first_name', 'parent_last_name', 'parent_email', 'parent_phone',
    'high_school_name', 'unweighted_gpa', 'weighted_gpa', 'expected_graduation_year',
    'applied_to_college', 'enrolled_in_college', 'intended_major', 'preferred_college_type',
    'top_3_schools', 'extracurricular_activities', 'ethnicity', 'gender',
    'schoolari_goals',
    'state', 'grade_level', 'fields_of_study',
    'background_tags', 'involvement_tags', 'college_start', 'biggest_challenge',
    'ethnicity_tags', 'financial_need',
    'account_type', 'career_interest', 'citizenship', 'sat_score_range', 'act_score_range'
  ];

  allowedKeys.forEach(key => {
    if (updates[key] !== undefined) {
      if (key === 'student_phone' || key === 'parent_phone') {
        safeUpdates[key] = formatPhoneE164(updates[key]);
      } else {
        safeUpdates[key] = updates[key];
      }
    }
  });

  Object.keys(safeUpdates).forEach(key => {
    if (safeUpdates[key] === undefined) {
      delete safeUpdates[key];
    }
  });

  const supabaseAdmin = await createAdminClient();

  // We need to fetch the target profile to compare if it's the student (if we aren't already the student)
  let existingProfile = currentUserProfile;
  if (targetId !== user.id) {
    const { data: tp } = await supabaseAdmin.from("profiles").select("*").eq("id", targetId).single();
    if (tp) existingProfile = tp;
  }

  const scholarshipFields = ['unweighted_gpa', 'grade_level', 'intended_major', 'state', 'extracurricular_activities', 'citizenship', 'sat_score_range', 'act_score_range', 'career_interest'];
  const collegeFields = ['unweighted_gpa', 'intended_major', 'career_interest', 'sat_score_range', 'act_score_range'];
  const jobFields = ['unweighted_gpa', 'intended_major', 'state', 'career_interest'];
  const taskFields = ['grade_level'];
  const resumeFields = ['student_first_name', 'student_last_name', 'student_email', 'student_phone', 'state', 'unweighted_gpa', 'grade_level', 'expected_graduation_year', 'high_school_name', 'career_interest', 'languages_spoken', 'extracurricular_activities'];

  let scholarshipsNeedRefresh = false;
  let collegesNeedRefresh = false;
  let jobsNeedRefresh = false;
  let tasksNeedRefresh = false;
  let resumeNeedsRefresh = false;

  scholarshipFields.forEach(field => {
    if (safeUpdates[field] !== undefined && JSON.stringify(safeUpdates[field]) !== JSON.stringify((existingProfile as any)?.[field])) {
      scholarshipsNeedRefresh = true;
    }
  });

  collegeFields.forEach(field => {
    if (safeUpdates[field] !== undefined && JSON.stringify(safeUpdates[field]) !== JSON.stringify((existingProfile as any)?.[field])) {
      collegesNeedRefresh = true;
    }
  });

  jobFields.forEach(field => {
    if (safeUpdates[field] !== undefined && JSON.stringify(safeUpdates[field]) !== JSON.stringify((existingProfile as any)?.[field])) {
      jobsNeedRefresh = true;
    }
  });

  taskFields.forEach(field => {
    if (safeUpdates[field] !== undefined && JSON.stringify(safeUpdates[field]) !== JSON.stringify((existingProfile as any)?.[field])) {
      tasksNeedRefresh = true;
    }
  });

  resumeFields.forEach(field => {
    if (safeUpdates[field] !== undefined && JSON.stringify(safeUpdates[field]) !== JSON.stringify((existingProfile as any)?.[field])) {
      resumeNeedsRefresh = true;
    }
  });

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(safeUpdates)
    .eq("id", targetId);

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  // ── Seed top_3_schools into saved_colleges ──
  if (safeUpdates.top_3_schools) {
    const schools: string[] = (safeUpdates.top_3_schools || []).filter(Boolean);
    if (schools.length > 0) {
      try {
        const { data: existing } = await supabaseAdmin
          .from("saved_colleges")
          .select("college_name")
          .eq("user_id", targetId);

        const existingNames = new Set((existing || []).map((c: any) => c.college_name.toLowerCase()));

        const toInsert = schools
          .filter((name) => !existingNames.has(name.toLowerCase()))
          .map((name) => ({
            user_id: targetId,
            college_name: name,
            status: "researching",
            deadline: null,
          }));

        if (toInsert.length > 0) {
          await supabaseAdmin.from("saved_colleges").insert(toInsert);
        }
      } catch (seedErr) {
        console.error("[Profile Update] Failed to seed top_3_schools into saved_colleges:", seedErr);
      }
    }
  }

  // Phase 2: Safe SSOT Resume Patching
  if (resumeNeedsRefresh) {
    try {
      const { data: resumesData } = await supabaseAdmin.from("resumes").select("id, content").eq("user_id", targetId).single();
      if (resumesData && resumesData.content && resumesData.content.resumes) {
        const updatedResumes = resumesData.content.resumes.map((r: any) => {
          if (r.header) {
            if (safeUpdates.student_first_name !== undefined) r.header.first_name = safeUpdates.student_first_name;
            if (safeUpdates.student_last_name !== undefined) r.header.last_name = safeUpdates.student_last_name;
            if (safeUpdates.student_email !== undefined) r.header.email = safeUpdates.student_email;
            if (safeUpdates.student_phone !== undefined) r.header.phone = safeUpdates.student_phone;
            if (safeUpdates.state !== undefined) r.header.city_state = safeUpdates.state;
          }
          if (r.education && r.education.length > 0) {
            if (safeUpdates.high_school_name !== undefined) r.education[0].institution = safeUpdates.high_school_name;
            if (safeUpdates.grade_level !== undefined) r.education[0].grade_level_or_degree = safeUpdates.grade_level;
            if (safeUpdates.expected_graduation_year !== undefined) r.education[0].graduation_year = safeUpdates.expected_graduation_year;
            if (safeUpdates.unweighted_gpa !== undefined) r.education[0].gpa_unweighted = safeUpdates.unweighted_gpa;
            if (safeUpdates.state !== undefined) r.education[0].location = safeUpdates.state;
          }
          return r;
        });
        await supabaseAdmin.from("resumes").update({ content: { ...resumesData.content, resumes: updatedResumes } }).eq("id", resumesData.id);
      }
    } catch (e) {
      console.error("Failed to sync resume with profile updates:", e);
    }
  }

  // Phase 3: Background AI Trigger Invalidations
  const cacheInvalidations: any = {};
  if (scholarshipsNeedRefresh) cacheInvalidations.scholarship_recommendations_cache = null;
  if (collegesNeedRefresh) cacheInvalidations.college_recommendations_cache = null;
  if (tasksNeedRefresh) cacheInvalidations.dashboard_cache = null;

  if (Object.keys(cacheInvalidations).length > 0) {
    try {
      await supabaseAdmin.from("profiles").update(cacheInvalidations).eq("id", targetId);
    } catch(e) {}
  }

  if (jobsNeedRefresh) {
    try {
      clearJobsCache();
    } catch(e) {}
  }

  // Sync to Constant Contact after successful update (fire and forget)
  const parentsListId = CONSTANT_CONTACT_PARENT_LIST;
  const studentsListId = CONSTANT_CONTACT_STUDENT_LIST;

  if (safeUpdates.student_email && studentsListId) {
    syncContact(
      safeUpdates.student_email,
      safeUpdates.student_first_name || "",
      safeUpdates.student_last_name || "",
      studentsListId
    ).catch(e => console.error("CC Sync Error (Student):", e));
  }

  if (safeUpdates.parent_email && parentsListId) {
    syncContact(
      safeUpdates.parent_email,
      safeUpdates.parent_first_name || "",
      safeUpdates.parent_last_name || "",
      parentsListId
    ).catch(e => console.error("CC Sync Error (Parent):", e));
  }

  // We do NOT use revalidatePath here because it will interfere with React State 
  // when used heavily in an edit form. The client component will handle state updates.
  return { 
    success: true, 
    scholarshipsRefreshed: scholarshipsNeedRefresh,
    collegesRefreshed: collegesNeedRefresh,
    jobsRefreshed: jobsNeedRefresh,
    tasksRefreshed: tasksNeedRefresh,
    resumeRefreshed: resumeNeedsRefresh 
  };
}
