"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAdminCoachingSessions() {
  const adminClient = await createAdminClient();

  const [sessionsRes, enrollmentsRes, profilesRes, authUsersRes] = await Promise.all([
    adminClient.from("coaching_sessions").select("*").order("session_date", { ascending: true }),
    adminClient.from("coaching_enrollments").select("*").order("created_at", { ascending: false }),
    adminClient.from("profiles").select("id, student_first_name, student_last_name, student_email, parent_first_name, parent_email, role"),
    adminClient.auth.admin.listUsers({ perPage: 1000 }).then(r => r.data?.users || []).catch(() => [])
  ]);

  if (sessionsRes.error) {
    console.error("Error fetching admin coaching sessions:", sessionsRes.error);
    return [];
  }

  // Also fetch notes manifest from vault storage as resilient backup
  let vaultNotesMap: Record<string, string> = {};
  try {
    const { data: dlData } = await adminClient.storage.from("vault").download("coaching-notes/enrollment-notes.json");
    if (dlData) {
      vaultNotesMap = JSON.parse(await dlData.text());
    }
  } catch (notesErr) {
    // ignore if not found
  }

  const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
  const authUserMap = new Map((authUsersRes || []).map((u: any) => [u.id, u]));

  const enrichedEnrollments = (enrollmentsRes.data || []).map(enrollment => {
    const profile = profileMap.get(enrollment.student_id);
    const authUser = authUserMap.get(enrollment.student_id);
    const firstName = profile?.student_first_name || profile?.parent_first_name || authUser?.user_metadata?.student_first_name || authUser?.email?.split("@")[0] || "Student";
    const lastName = profile?.student_last_name || authUser?.user_metadata?.student_last_name || "";
    const email = profile?.student_email || profile?.parent_email || authUser?.email || "";
    const resolvedNotes = enrollment.internal_notes || vaultNotesMap[enrollment.id] || "";

    return {
      ...enrollment,
      internal_notes: resolvedNotes,
      profiles: {
        student_first_name: firstName,
        student_last_name: lastName,
        student_email: email
      }
    };
  });

  return (sessionsRes.data || []).map(session => {
    const sessionEnrollments = enrichedEnrollments.filter(e => e.session_id === session.id);
    return {
      ...session,
      enrollments: sessionEnrollments
    };
  });
}

export async function getAdminStudentsList() {
  const adminClient = await createAdminClient();

  const [{ data: profiles }, authData] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id, student_first_name, student_last_name, student_email, parent_first_name, parent_email, account_type, role, grade_level")
      .order("created_at", { ascending: false }),
    adminClient.auth.admin.listUsers({ perPage: 1000 }).then(r => r.data?.users || []).catch(() => [])
  ]);

  const authUserMap = new Map(authData.map((u: any) => [u.id, u]));
  const staffRoles = ["super_admin", "admin", "college_coach", "essay_coach", "financial_aid_coach", "career_coach", "content_manager", "customer_support"];

  const students = (profiles || [])
    .filter((p: any) => {
      // Exclude parents, staff, and coaches
      if (p.account_type === "parent" || p.account_type === "staff") return false;
      if (staffRoles.includes(p.role)) return false;
      return true;
    })
    .map((p: any) => {
      const authUser = authUserMap.get(p.id);
      const name = [p.student_first_name, p.student_last_name].filter(Boolean).join(" ") ||
        authUser?.user_metadata?.student_first_name ||
        authUser?.email?.split("@")[0] ||
        "Student";
      const email = p.student_email || authUser?.email || "";

      return {
        id: p.id,
        name,
        email,
        grade_level: p.grade_level || ""
      };
    });

  return students;
}

export async function createSession(formData: FormData) {
  const adminClient = await createAdminClient();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const session_date = formData.get("session_date") as string;
  const meeting_link = formData.get("meeting_link") as string;
  const session_type = formData.get("session_type") as string;
  const duration_minutes = parseInt(formData.get("duration_minutes") as string) || 45;
  const student_ids_raw = formData.get("student_ids") as string;

  const parsedDate = new Date(session_date);
  if (isNaN(parsedDate.getTime()) || parsedDate.getTime() < Date.now() - 60000) {
    return { error: "Session date and time must be set to a present or future date." };
  }

  const { data: session, error } = await adminClient.from("coaching_sessions").insert({
    title,
    description,
    session_date: parsedDate.toISOString(),
    duration_minutes,
    meeting_link,
    session_type
  }).select().single();

  if (error) {
    return { error: error.message };
  }

  // If 1-on-1 session and students were assigned, create enrollments immediately
  if (session && session_type === "individual" && student_ids_raw) {
    try {
      let studentIds: string[] = [];
      try {
        studentIds = JSON.parse(student_ids_raw);
      } catch {
        studentIds = student_ids_raw.split(",").map(id => id.trim()).filter(Boolean);
      }

      if (Array.isArray(studentIds) && studentIds.length > 0) {
        const enrollments = studentIds.map(studentId => ({
          session_id: session.id,
          student_id: studentId,
          attendance_status: "registered"
        }));

        await adminClient.from("coaching_enrollments").insert(enrollments);
      }
    } catch (enrollErr) {
      console.error("Error creating initial enrollments for 1-on-1 session:", enrollErr);
    }
  }

  revalidatePath("/admin/coaching");
  revalidatePath("/coaching");
  return { success: true };
}

export async function updateSession(sessionId: string, formData: FormData) {
  const adminClient = await createAdminClient();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const session_date = formData.get("session_date") as string;
  const meeting_link = formData.get("meeting_link") as string;
  const session_type = formData.get("session_type") as string;
  const duration_minutes = parseInt(formData.get("duration_minutes") as string) || 45;
  const student_ids_raw = formData.get("student_ids") as string;

  const parsedDate = new Date(session_date);
  if (isNaN(parsedDate.getTime()) || parsedDate.getTime() < Date.now() - 60000) {
    return { error: "Session date and time must be set to a present or future date." };
  }

  const { error } = await adminClient.from("coaching_sessions").update({
    title,
    description,
    session_date: parsedDate.toISOString(),
    duration_minutes,
    meeting_link,
    session_type
  }).eq("id", sessionId);

  if (error) {
    return { error: error.message };
  }

  // If 1-on-1 session, update student enrollment
  if (session_type === "individual" && student_ids_raw) {
    try {
      let studentIds: string[] = [];
      try {
        studentIds = JSON.parse(student_ids_raw);
      } catch {
        studentIds = student_ids_raw.split(",").map(id => id.trim()).filter(Boolean);
      }

      if (Array.isArray(studentIds) && studentIds.length > 0) {
        await adminClient.from("coaching_enrollments").delete().eq("session_id", sessionId);
        const enrollments = studentIds.map(studentId => ({
          session_id: sessionId,
          student_id: studentId,
          attendance_status: "registered"
        }));
        await adminClient.from("coaching_enrollments").insert(enrollments);
      }
    } catch (enrollErr) {
      console.error("Error updating enrollments for session:", enrollErr);
    }
  }

  revalidatePath("/admin/coaching");
  revalidatePath("/coaching");
  return { success: true };
}

export async function deleteSession(id: string) {
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from("coaching_sessions").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/coaching");
  revalidatePath("/coaching");
  return { success: true };
}

export async function assignActionItem(studentId: string, title: string, category: string, dueDate: string) {
  const adminClient = await createAdminClient();

  const { error } = await adminClient.from("tasks").insert({
    user_id: studentId,
    title,
    description: category, // 'COACHING', 'SCHOLARSHIPS', etc.
    status: 'pending',
    due_date: new Date(dueDate).toISOString()
  });

  if (error) {
    return { error: error.message };
  }

  // Optionally trigger an email/SMS reminder here
  return { success: true };
}

export async function updateAttendance(enrollmentId: string, status: string) {
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("coaching_enrollments")
    .update({ attendance_status: status })
    .eq("id", enrollmentId);

  if (error) {
    return { error: error.message };
  }
  revalidatePath("/admin/coaching");
  return { success: true };
}

export async function updateCoachingNotes(enrollmentId: string, notes: string) {
  const adminClient = await createAdminClient();

  // 1. Try DB table update
  try {
    await adminClient
      .from("coaching_enrollments")
      .update({ internal_notes: notes })
      .eq("id", enrollmentId);
  } catch (dbErr) {
    console.warn("DB internal_notes update failed, using storage backup:", dbErr);
  }

  // 2. Also persist in vault storage backup
  try {
    const NOTES_FILE = "coaching-notes/enrollment-notes.json";
    let notesMap: Record<string, string> = {};
    try {
      const { data: dlData } = await adminClient.storage.from("vault").download(NOTES_FILE);
      if (dlData) {
        notesMap = JSON.parse(await dlData.text());
      }
    } catch { }

    notesMap[enrollmentId] = notes;

    await adminClient.storage.from("vault").upload(
      NOTES_FILE,
      new Blob([JSON.stringify(notesMap, null, 2)], { type: "application/json" }),
      { upsert: true }
    );
  } catch (storageErr) {
    console.warn("Vault storage notes backup error:", storageErr);
  }

  revalidatePath("/admin/coaching");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Coaching Resources & Handouts Management
// ─────────────────────────────────────────────────────────────────────────────

export type CoachingResourceItem = {
  id: "essays_statements" | "scholarships" | "financial_aid" | "applications";
  category: string;
  defaultTitle: string;
  title: string;
  description: string;
  iconName: "BookOpen" | "FileText" | "Sparkles" | "Download";
  color: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  updatedAt: string | null;
};

const DEFAULT_COACHING_RESOURCES: CoachingResourceItem[] = [
  {
    id: "essays_statements",
    category: "Essays & Statements",
    defaultTitle: "Common App & Coalition Essay Master Guide",
    title: "Common App & Coalition Essay Master Guide",
    description: "Proven brainstorming frameworks, hook strategies, and Stanford/Harvard accepted essay breakdowns.",
    iconName: "BookOpen",
    color: "bg-purple-100 text-purple-600",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    updatedAt: null,
  },
  {
    id: "scholarships",
    category: "Scholarships",
    defaultTitle: "Full-Ride Scholarship Interview Cheat Sheet",
    title: "Full-Ride Scholarship Interview Cheat Sheet",
    description: "Top 25 questions asked by committee interviewers and how to structure winning responses using the STAR method.",
    iconName: "FileText",
    color: "bg-blue-100 text-blue-600",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    updatedAt: null,
  },
  {
    id: "financial_aid",
    category: "Financial Aid",
    defaultTitle: "US College Admissions & Financial Aid Roadmap",
    title: "US College Admissions & Financial Aid Roadmap",
    description: "FAFSA & CSS Profile step-by-step checklist, SAI minimization tips, and appeal letter templates.",
    iconName: "Sparkles",
    color: "bg-emerald-100 text-emerald-600",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    updatedAt: null,
  },
  {
    id: "applications",
    category: "Applications",
    defaultTitle: "College Recommendation Letter Request Kit",
    title: "College Recommendation Letter Request Kit",
    description: "Brag sheet template and email scripts for teachers and high school counselors.",
    iconName: "Download",
    color: "bg-amber-100 text-amber-600",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    updatedAt: null,
  },
];

const MANIFEST_PATH = "coaching-resources/manifest.json";

export async function getCoachingResources(): Promise<CoachingResourceItem[]> {
  try {
    const adminClient = await createAdminClient();
    const { data, error } = await adminClient.storage.from("vault").download(MANIFEST_PATH);

    if (error || !data) {
      return DEFAULT_COACHING_RESOURCES;
    }

    const text = await data.text();
    const manifest = JSON.parse(text) as Record<string, Partial<CoachingResourceItem>>;

    return DEFAULT_COACHING_RESOURCES.map((def) => {
      const custom = manifest[def.id];
      if (!custom) return def;
      return {
        ...def,
        ...custom,
        id: def.id,
        category: def.category,
        color: def.color,
        iconName: def.iconName,
        title: custom.title || def.defaultTitle,
        description: custom.description || def.description,
      };
    });
  } catch (err) {
    console.error("Error loading coaching resources manifest:", err);
    return DEFAULT_COACHING_RESOURCES;
  }
}

export async function uploadCoachingResource(formData: FormData) {
  try {
    const adminClient = await createAdminClient();
    const resourceId = formData.get("resourceId") as string;
    const file = formData.get("file") as File;
    const customTitle = formData.get("title") as string;
    const customDescription = formData.get("description") as string;

    if (!resourceId || !file || file.size === 0) {
      return { error: "Please select a valid file to upload." };
    }

    // Ensure bucket exists
    const { data: buckets } = await adminClient.storage.listBuckets();
    if (!buckets?.find((b) => b.name === "vault")) {
      await adminClient.storage.createBucket("vault", { public: true });
    }

    const ext = file.name.split(".").pop() || "pdf";
    const storagePath = `coaching-resources/${resourceId}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("vault")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = adminClient.storage.from("vault").getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Load existing manifest
    const currentList = await getCoachingResources();
    const manifest: Record<string, any> = {};
    for (const item of currentList) {
      manifest[item.id] = {
        title: item.title,
        description: item.description,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        fileSize: item.fileSize,
        updatedAt: item.updatedAt,
      };
    }

    // Update target item
    manifest[resourceId] = {
      title: customTitle || manifest[resourceId]?.title,
      description: customDescription || manifest[resourceId]?.description,
      fileUrl: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      updatedAt: new Date().toISOString(),
    };

    // Save manifest
    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2));
    await adminClient.storage.from("vault").upload(MANIFEST_PATH, manifestBuffer, {
      contentType: "application/json",
      upsert: true,
    });

    revalidatePath("/admin/coaching");
    revalidatePath("/coaching");
    return { success: true, publicUrl, fileName: file.name };
  } catch (err: any) {
    return { error: err.message || "Failed to upload resource." };
  }
}

export async function deleteCoachingResource(resourceId: string) {
  try {
    const adminClient = await createAdminClient();
    const currentList = await getCoachingResources();
    const manifest: Record<string, any> = {};

    for (const item of currentList) {
      manifest[item.id] = {
        title: item.title,
        description: item.description,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        fileSize: item.fileSize,
        updatedAt: item.updatedAt,
      };
    }

    if (manifest[resourceId]) {
      manifest[resourceId] = {
        ...manifest[resourceId],
        fileUrl: null,
        fileName: null,
        fileSize: null,
        updatedAt: new Date().toISOString(),
      };
    }

    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2));
    await adminClient.storage.from("vault").upload(MANIFEST_PATH, manifestBuffer, {
      contentType: "application/json",
      upsert: true,
    });

    revalidatePath("/admin/coaching");
    revalidatePath("/coaching");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete resource." };
  }
}

export interface AdminCoachingFeedbackItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  sessionId?: string | null;
  sessionTitle: string;
  rating: number;
  comments: string;
  createdAt: string;
}

/**
 * Fetch all student feedback submissions for the admin coaching panel
 */
export async function getAdminCoachingFeedback(): Promise<AdminCoachingFeedbackItem[]> {
  try {
    const adminClient = await createAdminClient();

    // Build session title lookup map for resilient name resolution
    const sessionMap = new Map<string, string>();
    try {
      const { data: allSessions } = await adminClient.from("coaching_sessions").select("id, title");
      if (allSessions) {
        allSessions.forEach((s: any) => {
          if (s.id && s.title) sessionMap.set(s.id, s.title);
        });
      }
    } catch (sErr) {
      console.warn("Session map lookup error:", sErr);
    }

    // 1. Try fetching from coaching_feedback joined with sessions and profiles
    try {
      const { data: dbData, error: dbError } = await (adminClient as any)
        .from("coaching_feedback")
        .select("*, coaching_sessions(title, coach_name), profiles:student_id(student_first_name, student_last_name, student_email)")
        .order("created_at", { ascending: false });

      if (!dbError && dbData && dbData.length > 0) {
        return dbData.map((f: any) => ({
          id: f.id,
          studentId: f.student_id,
          studentName: f.profiles?.student_first_name
            ? `${f.profiles.student_first_name} ${f.profiles.student_last_name || ""}`.trim()
            : "Student",
          studentEmail: f.profiles?.student_email || "",
          sessionId: f.session_id,
          sessionTitle: f.coaching_sessions?.title || (f.session_id && sessionMap.get(f.session_id)) || f.session_title || "General Coaching",
          rating: f.rating,
          comments: f.comments,
          createdAt: f.created_at,
        }));
      }
    } catch (dbErr) {
      console.warn("DB query for coaching feedback fallback:", dbErr);
    }

    // 2. Fallback to storage manifest
    try {
      const FEEDBACK_MANIFEST = "coaching-feedback/feedback.json";
      const { data: dlData } = await adminClient.storage.from("vault").download(FEEDBACK_MANIFEST);
      if (dlData) {
        const rawList = JSON.parse(await dlData.text());
        if (Array.isArray(rawList)) {
          return rawList.map((f: any) => ({
            id: f.id,
            studentId: f.student_id,
            studentName: f.student_name || "Student",
            studentEmail: f.student_email || "",
            sessionId: f.session_id,
            sessionTitle: (f.session_id && sessionMap.get(f.session_id)) || f.session_title || "General Coaching",
            rating: f.rating,
            comments: f.comments,
            createdAt: f.created_at,
          }));
        }
      }
    } catch (storageErr) {
      console.warn("Feedback manifest fallback:", storageErr);
    }

    return [];
  } catch (err) {
    console.error("Error in getAdminCoachingFeedback:", err);
    return [];
  }
}
