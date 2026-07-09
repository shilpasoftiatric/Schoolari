"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getSavedColleges() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("saved_colleges")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function addCollege(collegeName: string, deadline?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("saved_colleges")
    .insert([{ 
      user_id: user.id, 
      college_name: collegeName, 
      deadline: deadline || null,
      status: "researching"
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  revalidatePath("/colleges");
  revalidatePath("/dashboard");
  return data;
}

export async function updateCollege(id: string, updates: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const safeUpdates = {
    college_name: updates.college_name,
    deadline: updates.deadline,
    status: updates.status,
    notes: updates.notes,
    updated_at: new Date().toISOString()
  };

  // Clean undefined values
  Object.keys(safeUpdates).forEach(key => {
    if (safeUpdates[key as keyof typeof safeUpdates] === undefined) {
      delete safeUpdates[key as keyof typeof safeUpdates];
    }
  });

  const { error } = await supabase
    .from("saved_colleges")
    .update(safeUpdates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/colleges");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteCollege(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("saved_colleges")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/colleges");
  revalidatePath("/dashboard");
  return { success: true };
}
