"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdmin, requirePermission } from "@/app/actions/admin";
import { revalidatePath } from "next/cache";

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
 * Broadcast a message to ALL students (or filtered by role)
 */
export async function broadcastMessage(
  title: string,
  content: string,
  type: string,
  targetRole: "all" | "student" | "parent" = "all"
) {
  await requirePermission("send_messages");
  const adminClient = await createAdminClient();

  let query = adminClient.from("profiles").select("id");
  if (targetRole !== "all") {
    query = query.eq("account_type", targetRole);
  }

  const { data: users, error: usersError } = await query;
  if (usersError) return { error: usersError.message };

  if (!users || users.length === 0) return { error: "No users found" };

  const rows = users.map((u) => ({
    user_id: u.id,
    title,
    content,
    type,
    is_read: false,
  }));

  const { error } = await adminClient.from("coaching_messages").insert(rows);
  if (error) return { error: error.message };

  return { success: true, count: rows.length };
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

/**
 * Get summary stats for admin messages page
 */
export async function getMessageStats() {
  await requirePermission("send_messages");
  const adminClient = await createAdminClient();

  const [{ count: total }, { count: unread }] = await Promise.all([
    adminClient.from("coaching_messages").select("*", { count: "exact", head: true }),
    adminClient.from("coaching_messages").select("*", { count: "exact", head: true }).eq("is_read", false),
  ]);

  return { total: total || 0, unread: unread || 0 };
}
