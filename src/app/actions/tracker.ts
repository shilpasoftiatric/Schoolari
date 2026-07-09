"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Application } from "@/types/supabase";

export async function updateApplicationStatus(applicationId: string, status: Application["status"]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("applications")
    .update({ status: status, updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating application status:", error);
    throw new Error("Failed to update application status");
  }

  revalidatePath("/tracker");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteApplication(applicationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", applicationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting application:", error);
    throw new Error("Failed to delete application");
  }

  revalidatePath("/tracker");
  revalidatePath("/dashboard");
  return { success: true };
}
