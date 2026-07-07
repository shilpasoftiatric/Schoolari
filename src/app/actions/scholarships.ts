"use server";

import { createClient } from "@/lib/supabase/server";

export async function trackApplication(scholarshipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Attempt to insert the application tracking record
  // If the record already exists (user_id + scholarship_id constraint), it will just error silently or we can ignore it
  const { error } = await supabase
    .from("applications")
    .insert([
      {
        user_id: user.id,
        scholarship_id: scholarshipId,
        status: "In Progress",
      }
    ]);

  // If the error is a unique constraint violation, it means the user already tracked it.
  // We can safely ignore that specific error code (23505 in postgres).
  if (error && error.code !== "23505") {
    console.error("Error tracking application:", error);
    throw new Error("Failed to track scholarship application");
  }

  return { success: true };
}
