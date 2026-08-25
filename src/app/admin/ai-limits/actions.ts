"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/app/actions/admin";
import { revalidatePath } from "next/cache";

export async function updateAILimits(limits: any[]) {
  await requirePermission("manage_settings");
  const supabase = await createAdminClient();

  for (const limit of limits) {
    const { error } = await supabase
      .from("ai_limits")
      .upsert(
        {
          plan: limit.plan,
          ask_ai_limit: limit.ask_ai_limit,
          essay_limit: limit.essay_limit,
          resume_limit: limit.resume_limit,
          cover_letter_limit: limit.cover_letter_limit,
          monthly_budget_cap_usd: limit.monthly_budget_cap_usd !== undefined ? parseFloat(limit.monthly_budget_cap_usd) : (limit.plan === "starter" ? 15 : limit.plan === "scholar" ? 25 : 50),
        },
        { onConflict: "plan" }
      );

    if (error) {
      console.error("Failed to update AI limits:", error);
      throw new Error(`Failed to update limits for plan ${limit.plan}`);
    }
  }

  revalidatePath("/admin/ai-limits");
  revalidatePath("/profile"); // Revalidate user profile pages in case limits changed
}
