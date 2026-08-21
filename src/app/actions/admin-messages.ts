"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdmin, requirePermission } from "@/app/actions/admin";
import { revalidatePath } from "next/cache";
import { getPlanFromPriceId } from "@/lib/subscription";

/**
 * Send a message to a single student
 */
export async function sendMessageToStudent(
  userId: string,
  title: string,
  content: string,
  type: string
) {
  await requirePermission("send_messages");
  const adminClient = await createAdminClient();

  const { error } = await adminClient.from("coaching_messages").insert({
    user_id: userId,
    title,
    content,
    type,
    is_read: false,
  });

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Broadcast a message to ALL Elite students/parents (or filtered by target role)
 */
export async function broadcastMessage(
  title: string,
  content: string,
  type: string = "announcement",
  targetRole: "all" | "student" | "parent" = "all"
) {
  await requirePermission("send_messages");
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await adminClient.auth.getUser();

  let senderName = "Admissions Coach";
  let senderRole = "Coach";

  if (user) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("student_first_name, student_last_name, parent_first_name, role")
      .eq("id", user.id)
      .maybeSingle();

    const fullName =
      (profile &&
        [profile.student_first_name, profile.student_last_name]
          .filter(Boolean)
          .join(" ")) ||
      profile?.parent_first_name;

    if (fullName) {
      senderName = fullName;
    }
    const userRole = (profile?.role as string) || "college_coach";
    if (userRole === "super_admin") {
      senderRole = "Director";
    } else if (userRole === "college_coach") {
      senderRole = "College Coach";
    } else if (userRole === "essay_coach") {
      senderRole = "Essay Coach";
    } else {
      senderRole = "Admin";
    }
  }

  // Only broadcast to active Elite students and parents (exclude staff accounts and non-Elite plans)
  let query = adminClient
    .from("profiles")
    .select("id, role, account_type, stripe_price_id, linked_student_id")
    .not("role", "in", '("super_admin","admin","college_coach","essay_coach","content_manager","customer_support")');

  if (targetRole === "student") {
    query = query.or("account_type.eq.student,account_type.is.null");
  } else if (targetRole === "parent") {
    query = query.eq("account_type", "parent");
  }

  const { data: users, error: usersError } = await query;
  if (usersError) return { error: usersError.message };

  const eliteUsers = (users || []).filter((u: any) => {
    return getPlanFromPriceId(u.stripe_price_id) === "elite" || u.role === "elite";
  });

  if (!eliteUsers || eliteUsers.length === 0) return { error: "No Elite student/parent users found to receive broadcast" };

  const fullTitle = `[COACH][FROM_ID:${user?.id || "coach"}][FROM_EMAIL:${user?.email || ""}][NAME:${senderName}][ROLE:${senderRole}][BROADCAST] ${title}`;

  const rows = eliteUsers.map((u) => ({
    user_id: u.id,
    title: fullTitle,
    content,
    type: type || "announcement",
    is_read: false,
  }));

  const { data: inserted, error } = await adminClient
    .from("coaching_messages")
    .insert(rows)
    .select();

  if (error) return { error: error.message };

  return { success: true, count: rows.length, inserted };
}

/**
 * Delete a sent message for all users (find by title + content)
 */
export async function deleteMessages(ids: string[]) {
  await requirePermission("send_messages");
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("coaching_messages")
    .delete()
    .in("id", ids);

  if (error) return { error: error.message };

  revalidatePath("/admin/messages");
  return { success: true };
}

export interface AdminConversationUser {
  id: string;
  name: string;
  email: string;
  accountType: "student" | "parent" | "staff" | "coach";
  role: string;
  gradeLevel?: string;
  gpa?: string;
  avatarUrl?: string | null;
  lastMessageSnippet: string;
  lastMessageTime: string;
  lastTimestamp: number;
  unreadCount: number;
  messages: any[];
}

/**
 * Fetch all student & parent 2-way conversation threads for the coach/admin inbox
 */
export async function getAdminConversations(): Promise<AdminConversationUser[]> {
  await requirePermission("send_messages");
  const adminClient = await createAdminClient();

  const [{ data: profiles }, { data: authData }, { data: messages }] = await Promise.all([
    adminClient.from("profiles").select("*").order("created_at", { ascending: false }),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    adminClient.from("coaching_messages").select("*").order("created_at", { ascending: true }),
  ]);

  const authUsers = authData?.users || [];
  const authUserMap = new Map<string, any>();
  authUsers.forEach((u) => authUserMap.set(u.id, u));

  // Map of profiles by ID
  const profileMap = new Map<string, any>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p));

  // Collect all distinct user IDs that have messages OR are profiles
  const allUserIds = new Set<string>();
  (messages || []).forEach((m) => allUserIds.add(m.user_id));
  (profiles || []).forEach((p) => allUserIds.add(p.id));

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const currentProfile = currentUser ? profileMap.get(currentUser.id) : null;
  const currentRole = currentProfile?.role || "college_coach";
  const isSuperAdmin = currentRole === "super_admin";

  const conversations: AdminConversationUser[] = Array.from(allUserIds).map((userId) => {
    const p = profileMap.get(userId);
    const authUser = authUserMap.get(userId);

    const fullName =
      (p && [p.student_first_name, p.student_last_name].filter(Boolean).join(" ")) ||
      (p && [p.parent_first_name, p.parent_last_name].filter(Boolean).join(" ")) ||
      p?.first_name ||
      authUser?.user_metadata?.full_name ||
      authUser?.email?.split("@")[0] ||
      "Student";

    const email = p?.student_email || p?.parent_email || authUser?.email || "";

    const currentUserId = currentUser?.id?.toLowerCase();
    const currentUserEmail = currentUser?.email?.toLowerCase();

    // Strictly filter messages addressed to or replied by this specific staff member by Email and ID
    const userMsgs = (messages || []).filter((m) => {
      if (m.user_id !== userId) return false;

      const title = (m.title || "").toLowerCase();
      const isStudentMsg = title.includes("[student]") || m.type === "student_message";

      if (!isStudentMsg) {
        // Staff outgoing reply: only show if THIS staff member sent it
        const isFromMeById =
          currentUserId &&
          (title.includes(`[from_id:${currentUserId}]`) || title.includes(`[from:${currentUserId}]`));
        const isFromMeByEmail =
          currentUserEmail &&
          (title.includes(`[from_email:${currentUserEmail}]`) || title.includes(`[from:${currentUserEmail}]`));
        const isFromMeByRole =
          isSuperAdmin || (currentRole && title.includes(`[from_role:${currentRole.toLowerCase()}]`));
        const isWelcomeMsg = isSuperAdmin && title.includes("welcome to schoolari elite");
        return isFromMeById || isFromMeByEmail || isFromMeByRole || isWelcomeMsg;
      }

      // Inbound student message: ONLY show if addressed to this staff member's ID or EMAIL
      const isToMeById =
        currentUserId &&
        (title.includes(`[to_id:${currentUserId}]`) || title.includes(`[to:${currentUserId}]`));
      const isToMeByEmail =
        currentUserEmail &&
        (title.includes(`[to_email:${currentUserEmail}]`) || title.includes(`[to:${currentUserEmail}]`));

      return isToMeById || isToMeByEmail;
    });

    const unreadCount = userMsgs.filter(
      (m) => (m.title?.includes("[STUDENT]") || m.type === "student_message") && !m.is_read
    ).length;

    const lastMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1] : null;
    const lastSnippet = lastMsg
      ? (lastMsg.content || "").replace(/^\[STUDENT\](\[[^\]]+\])*\s*/, "")
      : "No messages yet";
    const lastTime = lastMsg
      ? new Date(lastMsg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "";
    const lastTimestamp = lastMsg ? new Date(lastMsg.created_at).getTime() : 0;

    // Detect if this account is actually a Coach / Staff / Admin vs Student vs Parent
    const isStaff =
      p?.account_type === "staff" ||
      ["super_admin", "admin", "college_coach", "content_manager", "customer_support"].includes(p?.role) ||
      fullName.toLowerCase().includes("coach") ||
      fullName.toLowerCase().includes("admin");

    const accountType: "student" | "parent" | "staff" = isStaff
      ? "staff"
      : p?.account_type === "parent"
      ? "parent"
      : "student";

    return {
      id: userId,
      name: fullName,
      email,
      accountType,
      role: p?.role || (isStaff ? "college_coach" : "user"),
      gradeLevel: isStaff ? "Admissions Staff" : p?.grade_level || "High School",
      gpa: isStaff ? "Coach" : p?.unweighted_gpa || "N/A",
      avatarUrl: null,
      lastMessageSnippet: lastSnippet,
      lastMessageTime: lastTime,
      lastTimestamp,
      unreadCount,
      messages: userMsgs,
    };
  });

  // Filter queue strictly to Students and Parents who are on the "Elite" plan
  const eliteStudentParentConversations = conversations.filter((c) => {
    if (c.accountType === "staff") return false;
    const p = profileMap.get(c.id);
    let isElite =
      getPlanFromPriceId(p?.stripe_price_id) === "elite" ||
      p?.subscription_tier === "elite" ||
      p?.role === "elite";

    if (!isElite && p?.account_type === "parent" && p?.linked_student_id) {
      const linkedP = profileMap.get(p.linked_student_id);
      if (
        getPlanFromPriceId(linkedP?.stripe_price_id) === "elite" ||
        linkedP?.subscription_tier === "elite" ||
        linkedP?.role === "elite"
      ) {
        isElite = true;
      }
    }
    return isElite;
  });

  const finalConversations = eliteStudentParentConversations;

  // Sort: users with active conversations and latest activity at the top
  return finalConversations.sort((a, b) => {
    if (b.lastTimestamp !== a.lastTimestamp) {
      return b.lastTimestamp - a.lastTimestamp;
    }
    return b.messages.length - a.messages.length;
  });
}

import { createClient } from "@/lib/supabase/server";

/**
 * Send a direct reply from Coach/Admin to a student thread with authenticated identity
 */
export async function sendCoachReply(
  userId: string,
  content: string,
  type: string = "guidance"
) {
  await requirePermission("send_messages");
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let senderName = "Admissions Coach";
  let senderRole = "Coach";

  if (user) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("student_first_name, student_last_name, parent_first_name, role, account_type")
      .eq("id", user.id)
      .maybeSingle();

    const fullName =
      (profile &&
        [profile.student_first_name, profile.student_last_name]
          .filter(Boolean)
          .join(" ")) ||
      profile?.parent_first_name;

    if (fullName) {
      senderName = fullName;
    }
    const userRole = (profile?.role as string) || "college_coach";
    if (userRole === "super_admin") {
      senderRole = "Director";
    } else if (userRole === "college_coach") {
      senderRole = "College Coach";
    } else if (userRole === "essay_coach") {
      senderRole = "Essay Coach";
    } else {
      senderRole = "Coach";
    }
  }

  const title = `[COACH][FROM:${user?.id || "coach"}][FROM_ID:${user?.id || "coach"}][FROM_EMAIL:${user?.email || ""}][NAME:${senderName}][ROLE:${senderRole}] Advisory Feedback`;

  const { data, error } = await adminClient
    .from("coaching_messages")
    .insert({
      user_id: userId,
      title,
      content,
      type,
      is_read: false,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  return {
    success: true,
    message: data,
    senderId: user?.id,
    senderName,
    senderRole,
  };
}

/**
 * Mark student's incoming messages as read by admin/coach
 */
export async function markStudentMessagesAsRead(userId: string) {
  await requirePermission("send_messages");
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("coaching_messages")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) return { error: error.message };

  return { success: true };
}

/**
 * Get the total unread inquiries count strictly for the logged-in staff/coach
 */
export async function getStaffUnreadCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return 0;

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || "college_coach";

    // Fetch unread messages
    const { data: unreadMessages } = await adminClient
      .from("coaching_messages")
      .select("id, title, user_id, type")
      .eq("is_read", false);

    if (!unreadMessages || unreadMessages.length === 0) return 0;

    const currentUserId = user?.id?.toLowerCase();
    const currentUserEmail = user?.email?.toLowerCase();

    // Filter student messages addressed specifically to this staff member by Email or ID
    const myUnread = unreadMessages.filter((m) => {
      const isStudentMsg =
        m.type === "student_message" || (m.title && m.title.includes("[STUDENT]"));
      if (!isStudentMsg) return false;

      const title = (m.title || "").toLowerCase();
      const isToMeById =
        currentUserId &&
        (title.includes(`[to_id:${currentUserId}]`) || title.includes(`[to:${currentUserId}]`));
      const isToMeByEmail =
        currentUserEmail &&
        (title.includes(`[to_email:${currentUserEmail}]`) || title.includes(`[to:${currentUserEmail}]`));

      return isToMeById || isToMeByEmail;
    });

    return myUnread.length;
  } catch {
    return 0;
  }
}

/**
 * Get summary stats for admin messages page
 */
export async function getMessageStats() {
  try {
    const adminClient = await createAdminClient();

    const [{ count: total }, unreadCount] = await Promise.all([
      adminClient.from("coaching_messages").select("*", { count: "exact", head: true }),
      getStaffUnreadCount(),
    ]);

    return { total: total || 0, unread: unreadCount || 0 };
  } catch {
    return { total: 0, unread: 0 };
  }
}
