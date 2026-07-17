"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEssay(title: string, topic: string, content: string = "") {
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

export async function updateEssay(id: string, updates: { title?: string; topic?: string; content?: string; status?: string }) {
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
