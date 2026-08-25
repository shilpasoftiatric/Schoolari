"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFeatureAccess } from "@/lib/subscription-server";

export async function createEssay(title: string, topic: string, content: string = "") {
  await requireFeatureAccess("essays");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { masterId } = await getStudentDashboardData(user.id);

  const { enforceAiLimit } = await import("@/lib/ai-limits");
  await enforceAiLimit("essay_doc_create", masterId);

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from("essays")
    .insert([
      {
        user_id: masterId,
        title: title || "Untitled Essay",
        topic,
        content,
        status: "draft"
      }
    ])
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create essay: ${error.message}`);
  }

  revalidatePath("/essays");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return { id: data.id };
}

export async function updateEssay(id: string, updates: { title?: string; topic?: string; content?: string; status?: "completed" | "in_progress" | "draft" }) {
  await requireFeatureAccess("essays");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { masterId } = await getStudentDashboardData(user.id);
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("essays")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("user_id", masterId);

  if (error) {
    throw new Error(`Failed to save essay: ${error.message}`);
  }

  revalidatePath("/essays");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteEssay(id: string) {
  await requireFeatureAccess("essays");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { masterId } = await getStudentDashboardData(user.id);
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("essays")
    .delete()
    .eq("id", id)
    .eq("user_id", masterId);

  if (error) {
    throw new Error(`Failed to delete essay: ${error.message}`);
  }

  revalidatePath("/essays");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  redirect("/essays");
}
