"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getResume() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // Ignore not found, throw on other errors
    throw new Error(error.message);
  }

  return data;
}

export async function saveResume(content: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check if resume exists
  const existing = await getResume();

  let result;
  if (existing) {
    result = await supabase
      .from("resumes")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    result = await supabase
      .from("resumes")
      .insert([{ user_id: user.id, content }]);
  }

  if (result.error) throw new Error(result.error.message);

  revalidatePath("/career");
  return { success: true };
}

export async function updateCareerInterests(interests: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update({ career_interests: interests })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/career");
  return { success: true };
}
