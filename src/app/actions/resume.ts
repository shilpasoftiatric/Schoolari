"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ResumeDocument, UserResumesPayload } from "@/types/resume";
import { formatPhoneE164 } from "@/lib/phone";

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
      template_theme: "harvard",
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
    template_theme: "harvard",
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Fetch student profile for automatic prefill fallback
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: existing, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  if (!existing || !existing.content) {
    // Generate initial structured payload
    const initialPayload = migrateLegacyResumeContent({}, profile);
    await supabase.from("resumes").insert([
      {
        user_id: user.id,
        content: initialPayload
      }
    ]);
    return initialPayload;
  }

  const payload = migrateLegacyResumeContent(existing.content, profile);

  // If we migrated from legacy format, save updated structured format
  if (!existing.content.resumes || !Array.isArray(existing.content.resumes)) {
    await supabase
      .from("resumes")
      .update({ content: payload, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  return payload;
}

export async function saveResumesAction(payload: UserResumesPayload): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("resumes")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("resumes")
      .update({
        content: payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);

    if (error) throw new Error(`Failed to save resumes: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("resumes")
      .insert([
        {
          user_id: user.id,
          content: payload
        }
      ]);

    if (error) throw new Error(`Failed to create resume entry: ${error.message}`);
  }

  revalidatePath("/resume");
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

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
