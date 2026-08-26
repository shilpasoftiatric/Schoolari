"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAiDisclaimerStatus(): Promise<{
  essayDisclaimerAccepted: boolean;
  resumeDisclaimerAccepted: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { essayDisclaimerAccepted: true, resumeDisclaimerAccepted: true };

    const supabaseAdmin = await createAdminClient();
    const { data: profile }: any = await supabaseAdmin
      .from("profiles" as any)
      .select("essay_disclaimer_accepted, resume_disclaimer_accepted")
      .eq("id", user.id)
      .maybeSingle();

    const essayAccepted =
      Boolean(profile?.essay_disclaimer_accepted) ||
      Boolean(user.user_metadata?.essay_disclaimer_accepted);

    const resumeAccepted =
      Boolean(profile?.resume_disclaimer_accepted) ||
      Boolean(user.user_metadata?.resume_disclaimer_accepted);

    return {
      essayDisclaimerAccepted: essayAccepted,
      resumeDisclaimerAccepted: resumeAccepted,
    };
  } catch (err) {
    console.error("Error checking AI disclaimer status:", err);
    return { essayDisclaimerAccepted: false, resumeDisclaimerAccepted: false };
  }
}

export async function acceptAiDisclaimer(feature: "essay" | "resume") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const supabaseAdmin = await createAdminClient();
  const columnToUpdate = feature === "essay" ? "essay_disclaimer_accepted" : "resume_disclaimer_accepted";

  // 1. Update in profiles table
  try {
    await supabaseAdmin
      .from("profiles" as any)
      .update({ [columnToUpdate]: true })
      .eq("id", user.id);
  } catch (err) {
    console.warn(`Could not update ${columnToUpdate} directly on profiles:`, err);
  }

  // 2. Also update auth user metadata as resilient fallback
  try {
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata || {}),
        [columnToUpdate]: true,
      },
    });
  } catch (authErr) {
    console.warn(`Could not update user_metadata for ${columnToUpdate}:`, authErr);
  }

  revalidatePath(feature === "essay" ? "/essays" : "/resume");
  revalidatePath("/dashboard");
  return { success: true };
}
