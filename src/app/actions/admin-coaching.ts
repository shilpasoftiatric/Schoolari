"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSession(formData: FormData) {
  const adminClient = await createAdminClient();
  
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const session_date = formData.get("session_date") as string;
  const meeting_link = formData.get("meeting_link") as string;
  const session_type = formData.get("session_type") as string;

  const { error } = await adminClient.from("coaching_sessions").insert({
    title,
    description,
    session_date: new Date(session_date).toISOString(),
    meeting_link,
    session_type
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/coaching");
  return { success: true };
}

export async function deleteSession(id: string) {
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from("coaching_sessions").delete().eq("id", id);
  
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/coaching");
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
  
  const { error } = await adminClient
    .from("coaching_enrollments")
    .update({ internal_notes: notes })
    .eq("id", enrollmentId);

  if (error) {
    return { error: error.message };
  }
  revalidatePath("/admin/coaching");
  return { success: true };
}
