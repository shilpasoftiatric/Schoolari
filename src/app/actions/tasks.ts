"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeTask(taskId: string, taskTitle?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  let query = supabase
    .from("tasks")
    .update({ status: "completed" })
    .eq("user_id", user.id);

  if (taskId && !taskId.startsWith("temp-")) {
    query = query.eq("id", taskId);
  } else if (taskTitle) {
    query = query.eq("title", taskTitle).eq("status", "pending");
  } else {
    return { success: false, error: "Invalid task identifier" };
  }

  const { error } = await query;

  if (error) {
    console.error("Failed to complete task:", error);
    return { success: false, error: error.message };
  }

  // Clear dashboard cache so next task from master list is generated
  await forceDashboardRefresh(user.id);
  
  return { success: true };
}

export async function skipTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("tasks")
    .update({ status: "skipped" as any })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to skip task:", error);
    return { success: false, error: error.message };
  }

  await forceDashboardRefresh(user.id);
  
  return { success: true };
}

export async function moveTaskToTracker(taskId: string, title: string, category: string, dueDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { error: delError } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (delError) {
    console.error("Failed to delete task:", delError);
    return { success: false, error: delError.message };
  }

  const { error: insError } = await supabase
    .from("tracker_items")
    .insert({
      user_id: user.id,
      reference_type: category,
      title: title,
      status: "Not Started",
      due_date: dueDate
    });

  if (insError) {
    console.error("Failed to insert tracker item:", insError);
    return { success: false, error: insError.message };
  }

  await forceDashboardRefresh(user.id);
  
  return { success: true };
}

async function forceDashboardRefresh(userId: string) {
  const supabaseAdmin = await createClient(); // Wait, need service role for profile update if RLS blocks. RLS for profiles allows update for self though!
  
  // We can just set ai_dashboard_data = null to force a refresh on next load
  await supabaseAdmin
    .from("profiles")
    .update({ ai_dashboard_data: null })
    .eq("id", userId);
}
