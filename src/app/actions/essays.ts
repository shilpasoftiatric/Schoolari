"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFeatureAccess } from "@/lib/subscription-server";

export async function createEssay(title: string, topic: string, content: string = "") {
  await requireFeatureAccess("essays");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("essays")
    .insert([
      {
        user_id: user.id,
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
  revalidatePath("/dashboard");
  return { id: data.id };
}

export async function updateEssay(id: string, updates: { title?: string; topic?: string; content?: string; status?: "completed" | "in_progress" | "draft" }) {
  await requireFeatureAccess("essays");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("essays")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to save essay: ${error.message}`);
  }

  revalidatePath("/essays");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteEssay(id: string) {
  await requireFeatureAccess("essays");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("essays")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to delete essay: ${error.message}`);
  }

  revalidatePath("/essays");
  revalidatePath("/dashboard");
  redirect("/essays");
}

