"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ResumeDocument, UserResumesPayload } from "@/types/resume";
import { formatPhoneE164 } from "@/lib/phone";
import { requireFeatureAccess } from "@/lib/subscription-server";

/**
 * Migrate legacy single-resume format ({ personal, academic } or basic object)
 * into a structured multi-resume UserResumesPayload
 */
function migrateLegacyResumeContent(rawContent: any, userProfile?: any): UserResumesPayload {
  const defaultResumeId = "resume-" + Date.now();
  const defaultHeader = {
    first_name: userProfile?.student_first_name || userProfile?.first_name || "Student",
    last_name: userProfile?.student_last_name || userProfile?.last_name || "",
    email: userProfile?.student_email || userProfile?.email || "",
    phone: userProfile?.student_phone ? formatPhoneE164(userProfile.student_phone) : "+1 (555) 000-0000",
    city_state: userProfile?.state || "United States",
    summary: "Dedicated student with a strong academic foundation and a passion for professional growth and community leadership."
  };

  const defaultEducation = [
    {
      id: "edu-1",
      institution: userProfile?.high_school_name || "High School / College Name",
      grade_level_or_degree: userProfile?.grade_level || "11th Grade (Junior)",
      graduation_year: userProfile?.expected_graduation_year || "2026",
      gpa_unweighted: userProfile?.unweighted_gpa || "3.8",
      gpa_weighted: userProfile?.weighted_gpa || "4.3",
      honors_coursework: "AP / IB / Honors Coursework",
      location: userProfile?.state || "US"
    }
  ];

  if (!rawContent || Object.keys(rawContent).length === 0) {
    const defaultResume: ResumeDocument = {
      id: defaultResumeId,
      title: "General Academic & Professional Resume",
      template_theme: "classic",
      header: defaultHeader,
      education: defaultEducation,
      experience: [],
      extracurriculars: [],
      awards: [],
      skills: {
        technical: userProfile?.career_interests || ["Communication", "Leadership", "Research"],
        soft: ["Teamwork", "Problem Solving", "Time Management"],
        languages: userProfile?.languages_spoken || ["English"],
        certifications: []
      },
      last_modified: new Date().toISOString()
    };
    return {
      resumes: [defaultResume],
      active_resume_id: defaultResumeId
    };
  }

  // Check if it already matches UserResumesPayload schema
  if (rawContent.resumes && Array.isArray(rawContent.resumes) && rawContent.resumes.length > 0) {
    return rawContent as UserResumesPayload;
  }

  // Handle legacy personal/academic format from prototype
  const personalEdu = rawContent.personal?.education || rawContent.education || [];
  const personalExp = rawContent.personal?.experience || rawContent.experience || [];
  const personalSkills = rawContent.personal?.skills || rawContent.skills || [];

  const migratedResume: ResumeDocument = {
    id: defaultResumeId,
    title: "General Academic & Professional Resume",
    template_theme: "classic",
    header: defaultHeader,
    education: personalEdu.map((edu: any, idx: number) => ({
      id: `edu-legacy-${idx}`,
      institution: edu.school || defaultEducation[0].institution,
      grade_level_or_degree: edu.degree || defaultEducation[0].grade_level_or_degree,
      graduation_year: edu.year || defaultEducation[0].graduation_year,
      gpa_unweighted: userProfile?.unweighted_gpa || "3.8",
      gpa_weighted: userProfile?.weighted_gpa || "4.3",
      honors_coursework: "",
      location: userProfile?.state || "US"
    })),
    experience: personalExp.map((exp: any, idx: number) => ({
      id: `exp-legacy-${idx}`,
      title: exp.role || "Team Member / Leader",
      organization: exp.company || "Organization",
      location: userProfile?.state || "US",
      start_date: "2024",
      end_date: exp.duration || "Present",
      is_current: true,
      bullets: exp.description
        ? exp.description.split("\n").map((b: string) => b.trim().replace(/^[\*\-\u2022]\s*/, "")).filter(Boolean)
        : ["Collaborated with team members to execute projects and achieve organization goals."]
    })),
    extracurriculars: (rawContent.academic?.extracurriculars || []).map((ext: any, idx: number) => ({
      id: `ext-legacy-${idx}`,
      activity: ext.activity || "Club / Organization",
      role: ext.role || "Member",
      start_date: "2024",
      end_date: ext.duration || "Present",
      hours_per_week: "4 hrs/week",
      bullets: ext.description
        ? ext.description.split("\n").map((b: string) => b.trim().replace(/^[\*\-\u2022]\s*/, "")).filter(Boolean)
        : []
    })),
    awards: (rawContent.academic?.awards || []).map((awd: any, idx: number) => ({
      id: `awd-legacy-${idx}`,
      title: awd.title || "Academic Recognition",
      issuer: awd.issuer || "School",
      year: awd.year || "2025",
      level: "School",
      description: awd.description || ""
    })),
    skills: {
      technical: Array.isArray(personalSkills) ? personalSkills : ["Research", "Leadership"],
      soft: ["Teamwork", "Communication"],
      languages: ["English"],
      certifications: []
    },
    last_modified: new Date().toISOString()
  };

  return {
    resumes: [migratedResume],
    active_resume_id: defaultResumeId
  };
}

export async function getResumesAction(): Promise<UserResumesPayload> {
  const { getUserPlan } = await import("@/lib/subscription-server");
  const { canAccessFeature } = await import("@/lib/subscription");
  const plan = await getUserPlan();
  if (!canAccessFeature(plan, "resume")) {
    return { resumes: [], active_resume_id: "" }; // Graceful return to avoid terminal spam
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { masterId } = await getStudentDashboardData(user.id);
  const adminClient = await createAdminClient();

  // Fetch student profile for automatic prefill fallback
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", masterId)
    .maybeSingle();

  const { data: existing, error } = await adminClient
    .from("resumes")
    .select("*")
    .eq("user_id", masterId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  if (!existing || !existing.content) {
    // Generate initial structured payload
    const initialPayload = migrateLegacyResumeContent({}, profile);
    await adminClient.from("resumes").insert([
      {
        user_id: masterId,
        content: initialPayload
      }
    ]);

    // Sync the count (which is 1) to ai_usage
    const { getCurrentMonthString } = await import("@/lib/ai-limits");
    const currentMonth = getCurrentMonthString();
    const { data: usage } = await adminClient
      .from("ai_usage")
      .select("user_id")
      .eq("user_id", masterId)
      .maybeSingle();

    if (usage) {
      await adminClient
        .from("ai_usage")
        .update({ resume_docs_count: 1 })
        .eq("user_id", masterId);
    } else {
      await adminClient
        .from("ai_usage")
        .insert({
          user_id: masterId,
          current_month: currentMonth,
          resume_docs_count: 1,
          ask_ai_count: 0,
          essay_count: 0,
          resume_count: 0,
          cover_letter_count: 0,
          essay_docs_count: 0,
          estimated_cost_usd: 0,
          last_limit_reason: "None",
        });
    }

    return initialPayload;
  }

  const payload = migrateLegacyResumeContent(existing.content, profile);

  // If we migrated from legacy format, save updated structured format
  if (!existing.content.resumes || !Array.isArray(existing.content.resumes)) {
    await adminClient
      .from("resumes")
      .update({ content: payload, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  // Sync the usage count to the database!
  const resumeCount = Array.isArray(payload.resumes) ? payload.resumes.length : 0;
  const { getCurrentMonthString } = await import("@/lib/ai-limits");
  const currentMonth = getCurrentMonthString();
  const { data: usage } = await adminClient
    .from("ai_usage")
    .select("user_id")
    .eq("user_id", masterId)
    .maybeSingle();

  if (usage) {
    await adminClient
      .from("ai_usage")
      .update({ resume_docs_count: resumeCount })
      .eq("user_id", masterId);
  } else {
    await adminClient
      .from("ai_usage")
      .insert({
        user_id: masterId,
        current_month: currentMonth,
        resume_docs_count: resumeCount,
        ask_ai_count: 0,
        essay_count: 0,
        resume_count: 0,
        cover_letter_count: 0,
        essay_docs_count: 0,
        estimated_cost_usd: 0,
        last_limit_reason: "None",
      });
  }

  return payload;
}

export async function checkResumeCreationLimitAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { canCreate: false, used: 0, limit: 0, resetDate: "", error: "Unauthorized" };

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { masterId } = await getStudentDashboardData(user.id);

  const { checkDocumentCreationLimit } = await import("@/lib/ai-limits");
  return await checkDocumentCreationLimit("resume", masterId);
}

export async function enforceResumeDocCreateAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { masterId } = await getStudentDashboardData(user.id);

  const { enforceAiLimit } = await import("@/lib/ai-limits");
  await enforceAiLimit("resume_doc_create", masterId);
}

export async function saveResumesAction(payload: UserResumesPayload): Promise<{ success: boolean }> {
  await requireFeatureAccess("resume");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { masterId } = await getStudentDashboardData(user.id);
  const adminClient = await createAdminClient();

  const { data: existing } = await adminClient
    .from("resumes")
    .select("id, content")
    .eq("user_id", masterId)
    .maybeSingle();

  const newCount = Array.isArray(payload?.resumes) ? payload.resumes.length : 1;

  if (existing) {
    const prevCount = Array.isArray(existing.content?.resumes) ? existing.content.resumes.length : 1;
    if (newCount > prevCount) {
      const { enforceAiLimit } = await import("@/lib/ai-limits");
      await enforceAiLimit("resume_doc_create", masterId);
    }

    const { error } = await adminClient
      .from("resumes")
      .update({
        content: payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);

    if (error) throw new Error(`Failed to save resumes: ${error.message}`);
  } else {
    const { enforceAiLimit } = await import("@/lib/ai-limits");
    await enforceAiLimit("resume_doc_create", masterId);

    const { error } = await adminClient
      .from("resumes")
      .insert([
        {
          user_id: masterId,
          content: payload
        }
      ]);

    if (error) throw new Error(`Failed to create resume entry: ${error.message}`);
  }

  // Explicitly sync resume docs count to match payload count
  const { getCurrentMonthString } = await import("@/lib/ai-limits");
  const currentMonth = getCurrentMonthString();
  const { data: usage } = await adminClient
    .from("ai_usage")
    .select("user_id")
    .eq("user_id", masterId)
    .maybeSingle();

  if (usage) {
    await adminClient
      .from("ai_usage")
      .update({ resume_docs_count: newCount })
      .eq("user_id", masterId);
  } else {
    await adminClient
      .from("ai_usage")
      .insert({
        user_id: masterId,
        current_month: currentMonth,
        resume_docs_count: newCount,
        ask_ai_count: 0,
        essay_count: 0,
        resume_count: 0,
        cover_letter_count: 0,
        essay_docs_count: 0,
        estimated_cost_usd: 0,
        last_limit_reason: "None",
      });
  }

  revalidatePath("/resume");
  revalidatePath("/documents");
  revalidatePath("/career");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function exportResumeToVaultAction(
  title: string,
  contentBase64OrText: string,
  filename: string,
  isPdf: boolean = false
): Promise<{ success: boolean; documentId: string }> {
  await requireFeatureAccess("resume");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { masterId } = await getStudentDashboardData(user.id);
  const adminClient = await createAdminClient();

  // Ensure vault bucket exists
  const { data: buckets } = await adminClient.storage.listBuckets();
  if (!buckets?.find((b) => b.name === "vault")) {
    await adminClient.storage.createBucket("vault", { public: true });
  }

  const fileExt = isPdf ? "pdf" : "txt";
  const safeName = filename.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  const filePath = `${user.id}/${Date.now()}-${safeName}`;
  const contentType = isPdf ? "application/pdf" : "text/plain";

  const buffer = isPdf
    ? Buffer.from(contentBase64OrText, "base64")
    : Buffer.from(contentBase64OrText, "utf-8");

  const { error: uploadError } = await adminClient.storage
    .from("vault")
    .upload(filePath, buffer, { contentType, upsert: true });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = adminClient.storage.from("vault").getPublicUrl(filePath);

  const { data: insertedData, error: dbError } = await adminClient
    .from("documents")
    .insert([
      {
        user_id: user.id,
        name: `${title}.${fileExt}`,
        type: "resume",
        file_url: publicUrl,
        size_bytes: buffer.byteLength
      }
    ])
    .select("id")
    .single();

  if (dbError) {
    throw new Error(`Failed to log resume to Document Vault: ${dbError.message}`);
  }

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return { success: true, documentId: insertedData.id };
}

