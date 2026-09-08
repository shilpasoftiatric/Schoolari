"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
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
 * Helper to determine if a profile is on the Elite plan, either directly
 * or through a linked family member (e.g. parent linked to an Elite student).
 */
function isProfileElite(
  profile: any,
  profileMap: Map<string, any>,
  allProfiles: any[] = []
): boolean {
  if (!profile) return false;

  // 1. Direct subscription / role check
  const directElite =
    getPlanFromPriceId(profile.stripe_price_id) === "elite" ||
    (profile as any).subscription_tier === "elite" ||
    profile.role === "elite";

  if (directElite) return true;

  // 2. Parent -> Linked Student by linked_student_id
  if (profile.account_type === "parent" && profile.linked_student_id) {
    const student = profileMap.get(profile.linked_student_id);
    if (
      student &&
      (getPlanFromPriceId(student.stripe_price_id) === "elite" ||
        (student as any).subscription_tier === "elite" ||
        student.role === "elite")
    ) {
      return true;
    }
  }

  // 3. Parent -> Student by matching student_email / parent_email
  if (profile.account_type === "parent") {
    const parentEmail = (profile.parent_email || profile.email || "").toLowerCase().trim();
    if (parentEmail) {
      const studentMatch = allProfiles.find(
        (p) =>
          p.account_type !== "parent" &&
          (p.parent_email || "").toLowerCase().trim() === parentEmail
      );
      if (
        studentMatch &&
        (getPlanFromPriceId(studentMatch.stripe_price_id) === "elite" ||
          (studentMatch as any).subscription_tier === "elite" ||
          studentMatch.role === "elite")
      ) {
        return true;
      }
    }
  }

  // 4. Student -> Parent (if parent holds the Elite subscription)
  if (profile.account_type !== "parent") {
    const parent = allProfiles.find(
      (p) => p.account_type === "parent" && p.linked_student_id === profile.id
    );
    if (
      parent &&
      (getPlanFromPriceId(parent.stripe_price_id) === "elite" ||
        (parent as any).subscription_tier === "elite" ||
        parent.role === "elite")
    ) {
      return true;
    }
  }

  return false;
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
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let senderName = "Super Admin";
  let senderRole = "super_admin";
  let senderEmail = user?.email || "superadmin@schoolari.com";
  let senderId = user?.id || "";

  if (user) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("student_first_name, student_last_name, parent_first_name, role, student_email, parent_email")
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
    const userRole = (profile?.role as string) || "super_admin";
    senderRole = userRole;
    if (profile?.student_email || profile?.parent_email) {
      senderEmail = profile.student_email || profile.parent_email;
    }
  } else {
    const { data: superAdmin } = await adminClient
      .from("profiles")
      .select("id, student_first_name, student_last_name, student_email, role")
      .eq("role", "super_admin")
      .limit(1)
      .maybeSingle();

    if (superAdmin) {
      senderId = superAdmin.id;
      senderEmail = superAdmin.student_email || "superadmin@schoolari.com";
      senderName =
        [superAdmin.student_first_name, superAdmin.student_last_name].filter(Boolean).join(" ") ||
        "Super Admin";
      senderRole = superAdmin.role;
    }
  }

  // Fetch all non-staff profiles so family linkages (parents to elite students) are fully resolved
  const { data: allProfiles, error: usersError } = await adminClient
    .from("profiles")
    .select("id, role, account_type, stripe_price_id, linked_student_id, student_email, parent_email")
    .not("role", "in", '("super_admin","admin","college_coach","essay_coach","content_manager","customer_support")');

  if (usersError) return { error: usersError.message };

  const profileMap = new Map<string, any>();
  (allProfiles || []).forEach((p) => profileMap.set(p.id, p));

  const eliteUsers = (allProfiles || []).filter((u: any) => {
    // Role filter
    if (targetRole === "student" && u.account_type === "parent") return false;
    if (targetRole === "parent" && u.account_type !== "parent") return false;

    // Elite status check (direct or through family link)
    return isProfileElite(u, profileMap, allProfiles || []);
  });

  if (!eliteUsers || eliteUsers.length === 0) return { error: "No Elite student/parent users found to receive broadcast" };

  const fullTitle = `[COACH][FROM:${senderId}][FROM_ID:${senderId}][FROM_EMAIL:${senderEmail}][FROM_ROLE:${senderRole}][FROM_NAME:${senderName}][NAME:${senderName}][ROLE:${senderRole}][BROADCAST] ${title}`;

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
    return isProfileElite(p, profileMap, profiles || []);
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

import { sendSMS } from "@/lib/twilio";
import { formatPhoneE164 } from "@/lib/phone";

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

/**
 * Get real-time audience estimates for Bulk SMS and Broadcasts
 */
export async function getAudienceEstimate(targetRole: "all" | "student" | "parent" = "all") {
  try {
    await requirePermission("send_messages");
    const adminClient = await createAdminClient();

    const { data: users, error } = await adminClient
      .from("profiles")
      .select("id, role, account_type, student_phone, parent_phone, phone, stripe_price_id, subscription_status, linked_student_id, student_email, parent_email")
      .not("role", "in", '("super_admin","admin","college_coach","essay_coach","content_manager","customer_support")');

    if (error) return { totalUsers: 0, usersWithPhone: 0, eliteUsers: 0 };

    const profileMap = new Map<string, any>();
    (users || []).forEach((p) => profileMap.set(p.id, p));

    const uniquePhones = new Set<string>();
    let totalUsers = 0;
    let eliteUsers = 0;

    for (const u of (users || [])) {
      let candidatePhones: (string | null | undefined)[] = [];

      if (targetRole === "student") {
        // Students: only student accounts and student mobile numbers
        if (u.account_type !== "parent") {
          totalUsers++;
          candidatePhones = [u.student_phone || u.phone].filter(Boolean);
        }
      } else if (targetRole === "parent") {
        // Parents: parent accounts only
        if (u.account_type === "parent") {
          totalUsers++;
          candidatePhones = [u.parent_phone || u.phone].filter(Boolean);
        }
      } else {
        // All members: both students and parents
        totalUsers++;
        const studentP = u.student_phone || (u.account_type !== "parent" ? u.phone : null);
        const parentP = u.parent_phone || (u.account_type === "parent" ? u.phone : null);
        candidatePhones = [studentP, parentP].filter(Boolean);
      }

      for (const p of candidatePhones) {
        const formatted = formatPhoneE164(p);
        if (formatted) {
          uniquePhones.add(formatted);
        }
      }

      // Check Elite status
      const isElite = isProfileElite(u, profileMap, users || []);
      if (isElite) {
        if (targetRole === "student" && u.account_type !== "parent") {
          eliteUsers++;
        } else if (targetRole === "parent" && u.account_type === "parent") {
          eliteUsers++;
        } else if (targetRole === "all") {
          eliteUsers++;
        }
      }
    }

    return { totalUsers, usersWithPhone: uniquePhones.size, eliteUsers };
  } catch (err: any) {
    console.error("[getAudienceEstimate]", err);
    return { totalUsers: 0, usersWithPhone: 0, eliteUsers: 0 };
  }
}

export interface ScheduledMessageItem {
  id: string;
  sender_id?: string | null;
  target_user_id?: string | null;
  target_user_name?: string | null;
  target_role: "all" | "student" | "parent";
  delivery_channel: "in_app" | "sms" | "both";
  title: string;
  content: string;
  message_type: string;
  scheduled_for: string;
  status: "pending" | "sent" | "cancelled" | "failed";
  sent_at?: string | null;
  sent_count?: number;
  created_at?: string;
}

/**
 * Schedule a direct 1-on-1 message to a student or parent for a future date/time
 */
export async function scheduleDirectMessage(data: {
  targetUserId: string;
  content: string;
  scheduledFor: string;
  messageType?: string;
  deliveryChannel?: "in_app" | "sms" | "both";
}) {
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
      .select("student_first_name, student_last_name, parent_first_name, role")
      .eq("id", user.id)
      .maybeSingle();

    const fullName =
      (profile &&
        [profile.student_first_name, profile.student_last_name].filter(Boolean).join(" ")) ||
      profile?.parent_first_name;

    if (fullName) senderName = fullName;
    const userRole = (profile?.role as string) || "college_coach";
    if (userRole === "super_admin") senderRole = "Director";
    else if (userRole === "college_coach") senderRole = "College Coach";
    else if (userRole === "essay_coach") senderRole = "Essay Coach";
  }

  const fullTitle = `[COACH][FROM:${user?.id || "coach"}][FROM_ID:${user?.id || "coach"}][FROM_EMAIL:${user?.email || ""}][NAME:${senderName}][ROLE:${senderRole}] Advisory Feedback`;

  const payload = {
    sender_id: user?.id || null,
    target_user_id: data.targetUserId,
    target_role: "student",
    delivery_channel: data.deliveryChannel || "in_app",
    title: fullTitle,
    content: data.content.trim(),
    message_type: data.messageType || "guidance",
    scheduled_for: new Date(data.scheduledFor).toISOString(),
    status: "pending",
  };

  const { data: inserted, error } = await adminClient
    .from("scheduled_messages" as any)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[scheduleDirectMessage] Error inserting schedule:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/messages");
  return { success: true, item: inserted };
}

/**
 * Schedule a broadcast announcement for a future date/time
 */
export async function scheduleBroadcastMessage(data: {
  title: string;
  content: string;
  scheduledFor: string;
  targetRole?: "all" | "student" | "parent";
  messageType?: string;
  deliveryChannel?: "in_app" | "sms" | "both";
}) {
  await requirePermission("send_messages");
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let senderName = "Super Admin";
  let senderRole = "super_admin";
  let senderEmail = user?.email || "superadmin@schoolari.com";
  let senderId = user?.id || "";

  if (user) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("student_first_name, student_last_name, parent_first_name, role, student_email, parent_email")
      .eq("id", user.id)
      .maybeSingle();

    const fullName =
      (profile &&
        [profile.student_first_name, profile.student_last_name].filter(Boolean).join(" ")) ||
      profile?.parent_first_name;

    if (fullName) senderName = fullName;
    const userRole = (profile?.role as string) || "super_admin";
    senderRole = userRole;
    if (profile?.student_email || profile?.parent_email) {
      senderEmail = profile.student_email || profile.parent_email;
    }
  } else {
    const { data: superAdmin } = await adminClient
      .from("profiles")
      .select("id, student_first_name, student_last_name, student_email, role")
      .eq("role", "super_admin")
      .limit(1)
      .maybeSingle();

    if (superAdmin) {
      senderId = superAdmin.id;
      senderEmail = superAdmin.student_email || "superadmin@schoolari.com";
      senderName =
        [superAdmin.student_first_name, superAdmin.student_last_name].filter(Boolean).join(" ") ||
        "Super Admin";
      senderRole = superAdmin.role;
    }
  }

  const fullTitle = `[COACH][FROM:${senderId}][FROM_ID:${senderId}][FROM_EMAIL:${senderEmail}][FROM_ROLE:${senderRole}][FROM_NAME:${senderName}][NAME:${senderName}][ROLE:${senderRole}][BROADCAST] ${data.title.trim()}`;

  const payload = {
    sender_id: user?.id || null,
    target_user_id: null,
    target_role: data.targetRole || "all",
    delivery_channel: data.deliveryChannel || "in_app",
    title: fullTitle,
    content: data.content.trim(),
    message_type: data.messageType || "announcement",
    scheduled_for: new Date(data.scheduledFor).toISOString(),
    status: "pending",
  };

  const { data: inserted, error } = await adminClient
    .from("scheduled_messages" as any)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[scheduleBroadcastMessage] Error inserting schedule:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/messages");
  return { success: true, item: inserted };
}

/**
 * Fetch all pending scheduled messages
 */
export async function getScheduledMessages(): Promise<ScheduledMessageItem[]> {
  try {
    await requirePermission("send_messages");
    const adminClient = await createAdminClient();

    // Auto-process any pending messages that are already due
    await processDueScheduledMessages();

    const { data: list, error } = await adminClient
      .from("scheduled_messages" as any)
      .select("*")
      .eq("status", "pending")
      .order("scheduled_for", { ascending: true });

    if (error || !list) return [];

    // Fetch names for target user IDs
    const targetUserIds = Array.from(new Set(list.map((i: any) => i.target_user_id).filter(Boolean)));
    const nameMap = new Map<string, string>();

    if (targetUserIds.length > 0) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, student_first_name, student_last_name, parent_first_name, parent_last_name")
        .in("id", targetUserIds);

      (profiles || []).forEach((p: any) => {
        const name =
          [p.student_first_name, p.student_last_name].filter(Boolean).join(" ") ||
          [p.parent_first_name, p.parent_last_name].filter(Boolean).join(" ") ||
          "Student";
        nameMap.set(p.id, name);
      });
    }

    return list.map((item: any) => ({
      ...item,
      target_user_name: item.target_user_id ? nameMap.get(item.target_user_id) || "Student" : null,
    }));
  } catch (err: any) {
    console.error("[getScheduledMessages] Error:", err);
    return [];
  }
}

/**
 * Cancel a pending scheduled message
 */
export async function cancelScheduledMessage(id: string) {
  try {
    await requirePermission("send_messages");
    const adminClient = await createAdminClient();

    const { error } = await adminClient
      .from("scheduled_messages" as any)
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/admin/messages");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Send Bulk SMS and/or In-App Notifications immediately to Students, Parents, or Both
 */
export async function sendBulkSMS(data: {
  title?: string;
  content: string;
  targetRole: "all" | "student" | "parent";
  deliveryChannel: "sms" | "in_app" | "both";
  messageType?: string;
}) {
  await requirePermission("send_messages");
  const adminClient = await createAdminClient();

  const title = (data.title || "Schoolari Announcement").trim();
  const content = data.content.trim();
  const channel = data.deliveryChannel || "sms";

  // Query all non-staff member profiles
  const { data: users, error: usersError } = await adminClient
    .from("profiles")
    .select("id, role, account_type, student_first_name, parent_first_name, student_phone, parent_phone, phone, student_email, parent_email, stripe_price_id, subscription_status, linked_student_id")
    .not("role", "in", '("super_admin","admin","college_coach","essay_coach","content_manager","customer_support")');

  if (usersError) return { error: usersError.message };

  if (!users || users.length === 0) {
    return { error: "No users found in the selected target audience." };
  }

  const profileMap = new Map<string, any>();
  (users || []).forEach((p) => profileMap.set(p.id, p));

  let sentSMS = 0;
  let skippedSMS = 0;
  let failedSMS = 0;
  let sentInApp = 0;

  // 1. Deliver In-App Messages & Notifications if channel includes in_app
  if (channel === "in_app" || channel === "both") {
    const inAppRes = await broadcastMessage(title, content, data.messageType || "announcement", data.targetRole);
    if ((inAppRes as any)?.count) {
      sentInApp = (inAppRes as any).count;
    }

    // In-App notifications are intended for Elite tier members
    const targetEliteUsers = (users as any[]).filter((u) => {
      if (data.targetRole === "student" && u.account_type === "parent") return false;
      if (data.targetRole === "parent" && u.account_type !== "parent") return false;

      return isProfileElite(u, profileMap, users || []);
    });

    const notifRows = targetEliteUsers.map((u) => ({
      user_id: u.id,
      title: title,
      message: content,
      type: data.messageType || "announcement",
      link: "/messages",
      is_read: false,
    }));

    if (notifRows.length > 0) {
      try {
        await adminClient.from("notifications").insert(notifRows as any);
      } catch (nErr) {
        console.warn("[sendBulkSMS] Notifications insert error:", nErr);
      }
    }
  }

  // 2. Deliver Twilio SMS if channel includes sms
  if (channel === "sms" || channel === "both") {
    const smsBody = `Schoolari: ${content}\n\nReply STOP to unsubscribe.`;

    // Extract unique valid E.164 phone numbers strictly matching targetRole
    const phoneToRecipient = new Map<string, { userId: string; role: "student" | "parent" }>();

    for (const u of (users as any[])) {
      let candidatePhones: { phone: string | null | undefined; role: "student" | "parent" }[] = [];

      if (data.targetRole === "student") {
        // STRICTLY Student mobile numbers only
        const studentP = u.student_phone || (u.account_type !== "parent" ? u.phone : null);
        if (studentP) {
          candidatePhones.push({ phone: studentP, role: "student" });
        }
      } else if (data.targetRole === "parent") {
        // STRICTLY Parent mobile numbers only
        const parentP = u.parent_phone || (u.account_type === "parent" ? u.phone : null);
        if (parentP) {
          candidatePhones.push({ phone: parentP, role: "parent" });
        }
      } else {
        // ALL: Both Students AND Parents
        const studentP = u.student_phone || (u.account_type !== "parent" ? u.phone : null);
        const parentP = u.parent_phone || (u.account_type === "parent" ? u.phone : null);

        if (studentP) {
          candidatePhones.push({ phone: studentP, role: "student" });
        }
        if (parentP) {
          candidatePhones.push({ phone: parentP, role: "parent" });
        }
      }

      let userHadValidPhone = false;
      for (const item of candidatePhones) {
        const formatted = formatPhoneE164(item.phone);
        if (formatted) {
          userHadValidPhone = true;
          if (!phoneToRecipient.has(formatted)) {
            phoneToRecipient.set(formatted, { userId: u.id, role: item.role });
          }
        }
      }

      if (!userHadValidPhone && candidatePhones.length > 0) {
        skippedSMS++;
      }
    }

    for (const [phone] of phoneToRecipient.entries()) {
      try {
        const res = await sendSMS(phone, smsBody);
        if (res.success) {
          sentSMS++;
        } else {
          failedSMS++;
        }
      } catch {
        failedSMS++;
      }
    }
  }

  return {
    success: true,
    sentSMS,
    skippedSMS,
    failedSMS,
    sentInApp,
    totalAudience: users.length,
  };
}

/**
 * Worker function: Process all scheduled messages that are due
 */
export async function processDueScheduledMessages(): Promise<{ success: boolean; processed: number }> {
  try {
    const adminClient = await createAdminClient();
    const now = new Date().toISOString();

    const { data: dueItems, error } = await adminClient
      .from("scheduled_messages" as any)
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now);

    const dueList = (dueItems || []) as any[];
    if (error || dueList.length === 0) return { success: true, processed: 0 };

    let processedCount = 0;

    for (const item of dueList) {
      try {
        const isDirect = Boolean(item.target_user_id);
        const channel = item.delivery_channel || "in_app";

        if (isDirect) {
          // Direct 1-on-1 scheduled delivery
          if (channel === "in_app" || channel === "both") {
            await adminClient.from("coaching_messages").insert({
              user_id: item.target_user_id,
              title: item.title,
              content: item.content,
              type: item.message_type || "guidance",
              is_read: false,
            });

            await adminClient.from("notifications").insert({
              user_id: item.target_user_id,
              title: "New Coach Guidance",
              message: item.content.slice(0, 120),
              type: item.message_type || "guidance",
              link: "/messages",
              is_read: false,
            } as any);
          }

          if (channel === "sms" || channel === "both") {
            const { data: profile } = await adminClient
              .from("profiles")
              .select("student_phone, parent_phone, phone, account_type")
              .eq("id", item.target_user_id)
              .maybeSingle();

            if (profile) {
              const pAny = profile as any;
              let targetPhone: string | null = null;
              if (item.target_role === "parent") {
                targetPhone = pAny?.parent_phone || (pAny?.account_type === "parent" ? pAny?.phone : null);
              } else if (item.target_role === "student") {
                targetPhone = pAny?.student_phone || (pAny?.account_type !== "parent" ? pAny?.phone : null);
              } else {
                targetPhone = pAny?.student_phone || pAny?.phone || pAny?.parent_phone;
              }

              const phone = formatPhoneE164(targetPhone);
              if (phone) {
                await sendSMS(phone, `Schoolari Coach: ${item.content}\n\nReply STOP to unsubscribe.`);
              }
            }
          }
        } else {
          // Broadcast scheduled delivery
          await sendBulkSMS({
            title: item.title.replace(/^\[COACH\](\[[^\]]+\])*\s*/, ""),
            content: item.content,
            targetRole: item.target_role || "all",
            deliveryChannel: channel,
            messageType: item.message_type || "announcement",
          });
        }

        // Mark as sent
        await adminClient
          .from("scheduled_messages" as any)
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            sent_count: 1,
          })
          .eq("id", item.id);

        processedCount++;
      } catch (procErr: any) {
        console.error(`[processDueScheduledMessages] Failed item ${item.id}:`, procErr);
        await adminClient
          .from("scheduled_messages" as any)
          .update({
            status: "failed",
            error_message: procErr.message,
          })
          .eq("id", item.id);
      }
    }

    return { success: true, processed: processedCount };
  } catch (err: any) {
    console.error("[processDueScheduledMessages] Error:", err);
    return { success: false, processed: 0 };
  }
}

