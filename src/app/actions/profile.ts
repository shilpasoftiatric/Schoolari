"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function saveOnboardingStep(step: number, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const payload: any = { onboarding_step: step };

  if (data.first_name !== undefined) payload.first_name = data.first_name;
  if (data.state !== undefined) payload.state = data.state;
  if (data.grade_level !== undefined) payload.grade_level = data.grade_level;
  if (data.gpa_range !== undefined) payload.gpa_range = data.gpa_range;
  if (data.fields_of_study !== undefined) payload.fields_of_study = data.fields_of_study;
  if (data.background_tags !== undefined) payload.background_tags = data.background_tags;
  if (data.involvement_tags !== undefined) payload.involvement_tags = data.involvement_tags;
  if (data.college_start !== undefined) payload.college_start = data.college_start;
  if (data.biggest_challenge !== undefined) payload.biggest_challenge = data.biggest_challenge;
  
  if (data.onboarding_complete) {
    payload.onboarding_complete = true;
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function updateProfile(updates: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const safeUpdates: any = {
    first_name: updates.first_name,
    phone: updates.phone,
    state: updates.state,
    grade_level: updates.grade_level,
    gpa_range: updates.gpa_range,
    fields_of_study: updates.fields_of_study,
    background_tags: updates.background_tags,
    involvement_tags: updates.involvement_tags,
    college_start: updates.college_start,
    biggest_challenge: updates.biggest_challenge,
    updated_at: new Date().toISOString()
  };

  Object.keys(safeUpdates).forEach(key => {
    if (safeUpdates[key] === undefined) {
      delete safeUpdates[key];
    }
  });

  const { error } = await supabase
    .from("profiles")
    .update(safeUpdates)
    .eq("id", user.id);

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  // We do NOT use revalidatePath here because it will interfere with React State 
  // when used heavily in an edit form. The client component will handle state updates.
  return { success: true };
}
