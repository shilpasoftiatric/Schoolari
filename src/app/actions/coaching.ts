"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ELITE_WELCOME_MESSAGE_CONTENT = `Hi! Welcome to Schoolari Elite! I’m excited to be part of your journey.

As your personal Schoolari Coach, I’m here to help you stay on track, make a plan, and move forward with confidence. Tell me how I can assist you.

You can message me here whenever you need help with your college or scholarship process, essays, applications, deadlines, or figuring out what to do next. You don’t have to figure it all out alone. We’ll work through it together, one step at a time.

Let’s get started!`;

export async function ensureEliteWelcomeMessage(userId?: string) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    targetUserId = user.id;
  }

  // 1. Check if user already has any elite welcome message(s)
  const { data: existingList } = await adminClient
    .from("coaching_messages")
    .select("id, created_at")
    .eq("user_id", targetUserId)
    .ilike("title", "%Welcome to Schoolari Elite%")
    .order("created_at", { ascending: true });

  if (existingList && existingList.length > 0) {
    // If duplicate welcome messages exist, delete extras and retain only the first
    if (existingList.length > 1) {
      const duplicateIds = existingList.slice(1).map((m: any) => m.id);
      await adminClient.from("coaching_messages").delete().in("id", duplicateIds);
    }
    return existingList[0]; // Already sent, never duplicate
  }

  // 2. Fetch Super Admin profile to tag correctly
  const { data: superAdmin } = await adminClient
    .from("profiles")
    .select("id, student_first_name, student_last_name, student_email, role")
    .eq("role", "super_admin")
    .limit(1)
    .maybeSingle();

  const senderId = superAdmin?.id || "super-admin";
  const senderEmail = (superAdmin?.student_email || "superadmin@schoolari.com").toLowerCase();
  const senderName = superAdmin?.student_first_name
    ? `${superAdmin.student_first_name} ${superAdmin.student_last_name || ""}`.trim()
    : "Super Admin";
  const senderRole = superAdmin?.role || "super_admin";

  const title = `[FROM_ID:${senderId}][FROM_EMAIL:${senderEmail}][FROM_ROLE:${senderRole}][FROM_NAME:${senderName}] Welcome to Schoolari Elite!`;

  // 3. Insert the single welcome message
  const { data, error } = await adminClient
    .from("coaching_messages")
    .insert({
      user_id: targetUserId,
      title,
      content: ELITE_WELCOME_MESSAGE_CONTENT,
      type: "guidance",
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting Elite welcome message:", error);
    return null;
  }

  return data;
}

export async function getCoachingMessages() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Ensure Elite welcome message is seeded and cleaned if needed
  try {
    await ensureEliteWelcomeMessage(user.id);
  } catch (seedErr) {
    console.warn("Could not seed elite welcome message:", seedErr);
  }

  const { data, error } = await supabase
    .from("coaching_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  // Strictly deduplicate messages in memory
  const seenWelcome = new Set<string>();
  const seenIds = new Set<string>();
  const dedupedData = (data || []).filter((m: any) => {
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);

    const title = (m.title || "").toLowerCase();
    if (title.includes("welcome to schoolari elite")) {
      if (seenWelcome.has(m.user_id)) {
        return false;
      }
      seenWelcome.add(m.user_id);
    }
    return true;
  });

  return dedupedData;
}

export async function getCoachingSessions() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  let targetId = user.id;
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("account_type, linked_student_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type === "parent" && profile?.linked_student_id) {
    targetId = profile.linked_student_id;
  }

  // Fetch upcoming and active sessions
  const bufferDate = new Date();
  bufferDate.setHours(bufferDate.getHours() - 24);

  const { data: sessions, error: sessionsError } = await adminSupabase
    .from("coaching_sessions")
    .select("*")
    .gte("session_date", bufferDate.toISOString())
    .order("session_date", { ascending: true });

  if (sessionsError) {
    console.error("Failed to fetch coaching sessions:", sessionsError);
    return [];
  }

  const { data: enrollments } = await adminSupabase
    .from("coaching_enrollments")
    .select("session_id, attendance_status")
    .eq("student_id", targetId);

  const enrolledSessionIds = (enrollments || []).map((e: any) => e.session_id);

  // Group sessions are visible to all students.
  // 1-on-1 (individual) sessions are strictly visible ONLY to the specific assigned/enrolled students.
  const visibleSessions = (sessions || []).filter((session: any) => {
    if (session.session_type === "group") return true;
    return enrolledSessionIds.includes(session.id);
  });

  return visibleSessions.map((session: any) => {
    const isEnrolled = enrolledSessionIds.includes(session.id);
    return {
      ...session,
      isEnrolled,
      meeting_link: isEnrolled ? session.meeting_link : null,
    };
  });
}

export async function enrollInSession(sessionId: string) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  let targetId = user.id;
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("account_type, linked_student_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type === "parent" && profile?.linked_student_id) {
    targetId = profile.linked_student_id;
  }

  const { error } = await adminSupabase
    .from("coaching_enrollments")
    .insert({
      session_id: sessionId,
      student_id: targetId,
      attendance_status: "registered",
    });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  revalidatePath("/coaching");
  revalidatePath("/admin/coaching");
  return { success: true };
}

export async function markMessageAsRead(id: string) {
  if (
    !id ||
    id.startsWith("msg-") ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return { success: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("coaching_messages")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  return { success: true };
}

export async function sendStudentMessage(
  content: string,
  contactId?: string,
  contactName?: string,
  contactEmail?: string,
  contactRole?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const idTag = contactId ? `[TO_ID:${contactId}][TO:${contactId}]` : "";
  const emailTag = contactEmail ? `[TO_EMAIL:${contactEmail}]` : "";
  const roleTag = contactRole ? `[TO_ROLE:${contactRole}]` : "";
  const nameTag = contactName ? `[TO_NAME:${contactName}]` : "";
  const title = `[STUDENT]${idTag}${emailTag}${roleTag}${nameTag} Message from Student`;

  const { data, error } = await supabase
    .from("coaching_messages")
    .insert({
      user_id: user.id,
      title,
      content,
      type: "guidance",
      is_read: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return { success: true, message: data, userId: user.id };
}

export interface CoachInfo {
  id: string;
  name: string;
  role: string;
  displayTitle: string;
  email: string;
  avatarUrl?: string | null;
  rating: number;
  studentsCount: number;
}

export async function getCoachInfo(): Promise<CoachInfo> {
  const adminSupabase = await createAdminClient();

  // 1. Check if there are sessions with an assigned coach_id
  const { data: latestSessionWithCoach } = await adminSupabase
    .from("coaching_sessions")
    .select("coach_id")
    .not("coach_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let coachProfile: any = null;
  if (latestSessionWithCoach?.coach_id) {
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("id", latestSessionWithCoach.coach_id)
      .maybeSingle();
    coachProfile = profile;
  }

  // 2. Prioritize profile with role 'college_coach'
  if (!coachProfile) {
    const { data: coachList } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("role", "college_coach")
      .order("created_at", { ascending: true })
      .limit(1);

    if (coachList && coachList.length > 0) {
      coachProfile = coachList[0];
    }
  }

  // 3. Fallback to staff / super_admin
  if (!coachProfile) {
    const { data: staffProfiles } = await adminSupabase
      .from("profiles")
      .select("*")
      .in("role", ["super_admin", "admin"])
      .order("created_at", { ascending: true })
      .limit(1);

    if (staffProfiles && staffProfiles.length > 0) {
      coachProfile = staffProfiles[0];
    }
  }

  if (!coachProfile) {
    return {
      id: "default-coach",
      name: "College Coach",
      role: "college_coach",
      displayTitle: "College Admissions Coach",
      email: "coach@schoolari.com",
      avatarUrl: null,
      rating: 4.9,
      studentsCount: 240,
    };
  }

  const fullName =
    coachProfile.full_name ||
    [coachProfile.student_first_name, coachProfile.student_last_name]
      .filter(Boolean)
      .join(" ") ||
    coachProfile.parent_first_name ||
    (coachProfile.role === "college_coach"
      ? "College Coach"
      : coachProfile.role === "super_admin"
        ? "Super Admin"
        : "Admissions Coach");

  const displayTitle =
    coachProfile.role === "super_admin"
      ? "Lead Admissions Director"
      : coachProfile.role === "college_coach"
        ? "College Admissions Coach"
        : coachProfile.role === "essay_coach"
          ? "Senior Essay Specialist"
          : "Admissions Coach";

  return {
    id: coachProfile.id,
    name: fullName,
    role: coachProfile.role,
    displayTitle,
    email: coachProfile.student_email || coachProfile.parent_email || "coach@schoolari.com",
    avatarUrl: coachProfile.avatar_url || null,
    rating: 4.9,
    studentsCount: 230,
  };
}

export interface CoachingContact {
  id: string;
  name: string;
  role: string;
  displayTitle: string;
  email: string;
  avatarUrl?: string | null;
  lastMessageSnippet?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export async function getCoachingContacts(): Promise<CoachingContact[]> {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const [{ data: staffProfiles }, authData, { data: messages }] = await Promise.all([
      adminSupabase
        .from("profiles")
        .select("*")
        .in("role", ["super_admin", "admin", "college_coach", "essay_coach"] as any)
        .order("created_at", { ascending: true }),
      adminSupabase.auth.admin
        .listUsers({ perPage: 1000 })
        .then((res) => res.data)
        .catch(() => ({ users: [] })),
      supabase
        .from("coaching_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    const authUserMap = new Map<string, any>();
    (authData?.users || []).forEach((u: any) => authUserMap.set(u.id, u));

    if (!staffProfiles || staffProfiles.length === 0) {
      return [
        {
          id: "coach-lead",
          name: "College Coach",
          role: "college_coach",
          displayTitle: "College Admissions Coach",
          email: "coach@schoolari.com",
          avatarUrl: null,
          lastMessageSnippet: "Tap to start conversation",
          lastMessageTime: "",
          unreadCount: 0,
        },
      ];
    }

    const seenIds = new Set<string>();
    const uniqueStaff = (staffProfiles || []).filter((p: any) => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });

    return uniqueStaff.map((p: any) => {
      const authUser = authUserMap.get(p.id);
      const staffEmail = (authUser?.email || p.student_email || p.parent_email || "").toLowerCase();

      const fullName =
        [p.student_first_name, p.student_last_name].filter(Boolean).join(" ") ||
        p.parent_first_name ||
        (p.role === "college_coach"
          ? "College Coach"
          : p.role === "super_admin"
            ? "Super Admin"
            : p.role === "essay_coach"
              ? "Essay Coach"
              : "Admin");

      const displayTitle =
        p.role === "super_admin"
          ? "Lead Admissions Director"
          : p.role === "college_coach"
            ? "College Admissions Coach"
            : p.role === "essay_coach"
              ? "Senior Essay Specialist"
              : "Admissions Coach";

      // Strict email & ID matching + welcome message support:
      const contactMsgs = (messages || []).filter((m: any) => {
        const title = (m.title || "").toLowerCase();
        const isStudentMsg = title.includes("[student]") || m.type === "student_message";

        if (title.includes("welcome to schoolari elite") && (p.role === "super_admin" || (p.id && title.includes(p.id.toLowerCase())))) {
          return true;
        }

        if (isStudentMsg) {
          // Message sent from student to this specific staff member
          const matchById = p.id && (title.includes(`[to_id:${p.id.toLowerCase()}]`) || title.includes(`[to:${p.id.toLowerCase()}]`));
          const matchByEmail = staffEmail && (title.includes(`[to_email:${staffEmail}]`) || title.includes(`[to:${staffEmail}]`));
          return matchById || matchByEmail;
        } else {
          // Reply sent by this specific staff member to student
          const matchById = p.id && (title.includes(`[from_id:${p.id.toLowerCase()}]`) || title.includes(`[from:${p.id.toLowerCase()}]`));
          const matchByEmail = staffEmail && (title.includes(`[from_email:${staffEmail}]`) || title.includes(`[from:${staffEmail}]`));
          const matchByRole = p.role && (title.includes(`[from_role:${p.role.toLowerCase()}]`) || title.includes(`[role:${p.role.toLowerCase()}]`));
          return matchById || matchByEmail || matchByRole;
        }
      });

      const unreadCount = contactMsgs.filter(
        (m: any) => m.title?.indexOf("[STUDENT]") === -1 && m.type !== "student_message" && !m.is_read
      ).length;

      const lastMsg = contactMsgs.length > 0 ? contactMsgs[contactMsgs.length - 1] : null;
      const lastSnippet = lastMsg
        ? (lastMsg.content || "").replace(/^\[STUDENT\](\[[^\]]+\])*\s*/, "")
        : "Tap to start conversation";
      const lastTime = lastMsg
        ? new Date(lastMsg.created_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
        : "";

      return {
        id: p.id,
        name: fullName,
        role: p.role,
        displayTitle,
        email: staffEmail,
        avatarUrl: p.avatar_url || null,
        lastMessageSnippet: lastSnippet,
        lastMessageTime: lastTime,
        unreadCount,
      };
    });
  } catch (err) {
    console.error("Error in getCoachingContacts:", err);
    return [];
  }
}

/**
 * Mark messages from coaches/admins as read by the student
 */
export async function markCoachMessagesAsRead(contactId?: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false };

    // Fetch unread messages for this student
    const { data: unreadMsgs } = await adminSupabase
      .from("coaching_messages")
      .select("id, title, type")
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!unreadMsgs || unreadMsgs.length === 0) return { success: true };

    // Filter to messages received from coaches (not student messages)
    const coachMsgIds = unreadMsgs
      .filter((m) => {
        const isStudent =
          m.type === "student_message" || (m.title && m.title.includes("[STUDENT]"));
        if (isStudent) return false;
        if (!contactId) return true;
        const title = m.title || "";
        return title.includes(`[FROM:${contactId}]`) || title.includes(`[FROM_ID:${contactId}]`);
      })
      .map((m) => m.id);

    if (coachMsgIds.length > 0) {
      await adminSupabase
        .from("coaching_messages")
        .update({ is_read: true })
        .in("id", coachMsgIds);
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Refresh latest messages and contacts for student on demand
 */
export async function getStudentCoachingData() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { contacts: [], messages: [] };

    const [contacts, { data: messages }] = await Promise.all([
      getCoachingContacts(),
      supabase
        .from("coaching_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    return {
      contacts: contacts || [],
      messages: messages || [],
    };
  } catch {
    return { contacts: [], messages: [] };
  }
}

export interface CoachingFeedbackPayload {
  sessionId?: string | null;
  rating: number;
  comments: string;
}

/**
 * Submit feedback on a coaching session or coach
 */
export async function submitCoachingFeedback(payload: CoachingFeedbackPayload) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const rating = Math.max(1, Math.min(5, Number(payload.rating) || 5));
    const comments = (payload.comments || "").trim();
    if (!comments) throw new Error("Please provide your comments or feedback.");

    const adminClient = await createAdminClient();

    // Look up session title if sessionId provided
    let sessionTitle = "General Coaching";
    if (payload.sessionId) {
      try {
        const { data: sess } = await adminClient
          .from("coaching_sessions")
          .select("title")
          .eq("id", payload.sessionId)
          .maybeSingle();
        if (sess?.title) sessionTitle = sess.title;
      } catch (sessErr) {
        console.warn("Session lookup warning:", sessErr);
      }
    }

    // 1. Try to insert directly into coaching_feedback table
    try {
      await (adminClient as any).from("coaching_feedback").insert([
        {
          student_id: user.id,
          session_id: payload.sessionId || null,
          rating,
          comments,
        },
      ]);
    } catch (e) {
      console.warn("DB feedback insert fallback to vault storage:", e);
    }

    // 2. Also persist to storage/manifest as resilient fallback
    try {
      const FEEDBACK_MANIFEST = "coaching-feedback/feedback.json";
      let existingList: any[] = [];
      const { data: dlData } = await adminClient.storage.from("vault").download(FEEDBACK_MANIFEST);
      if (dlData) {
        try {
          existingList = JSON.parse(await dlData.text());
        } catch { }
      }

      // Get student name/email
      const { data: profile } = await adminClient
        .from("profiles")
        .select("student_first_name, student_last_name, student_email")
        .eq("id", user.id)
        .maybeSingle();

      const studentName = profile?.student_first_name
        ? `${profile.student_first_name} ${profile.student_last_name || ""}`.trim()
        : user.email?.split("@")[0] || "Student";

      const newFeedbackItem = {
        id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        student_id: user.id,
        student_name: studentName,
        student_email: profile?.student_email || user.email,
        session_id: payload.sessionId || null,
        session_title: sessionTitle,
        rating,
        comments,
        created_at: new Date().toISOString(),
      };

      existingList.unshift(newFeedbackItem);

      await adminClient.storage
        .from("vault")
        .upload(FEEDBACK_MANIFEST, Buffer.from(JSON.stringify(existingList, null, 2)), {
          contentType: "application/json",
          upsert: true,
        });
    } catch (storageErr) {
      console.warn("Feedback storage backup warning:", storageErr);
    }

    revalidatePath("/coaching");
    revalidatePath("/admin/coaching");
    return { success: true };
  } catch (err: any) {
    console.error("Error submitting coaching feedback:", err);
    return { error: err.message || "Failed to submit feedback" };
  }
}
