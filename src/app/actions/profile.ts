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
  if (data.onboarding_complete) payload.onboarding_complete = true;

  const allowedKeys = [
    'first_name', 'state', 'grade_level', 'gpa_range', 'fields_of_study', 
    'background_tags', 'involvement_tags', 'college_start', 'biggest_challenge', 
    'school_type', 'ethnicity_tags', 'financial_need', 'dashboard_priorities', 
    'account_type', 'career_interests'
  ];

  allowedKeys.forEach(key => {
    if (data[key] !== undefined) payload[key] = data[key];
  });

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

  const safeUpdates: any = { updated_at: new Date().toISOString() };

  const allowedKeys = [
    'first_name', 'phone', 'state', 'grade_level', 'gpa_range', 'fields_of_study', 
    'background_tags', 'involvement_tags', 'college_start', 'biggest_challenge', 
    'school_type', 'ethnicity_tags', 'financial_need', 'dashboard_priorities', 
    'account_type', 'career_interests'
  ];

  allowedKeys.forEach(key => {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  });

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
