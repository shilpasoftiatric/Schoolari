import { createAdminClient, getAuthenticatedUser } from "./supabase/server";
import { getSubscriptionInfo } from "@/app/actions/subscription";

export type AIFeature =
  | "ask_ai"
  | "essay_doc_create"
  | "resume_doc_create"
  | "essay_tool"
  | "resume_tool"
  | "cover_letter";

export interface AIUsageData {
  plan: string;
  ask_ai: { used: number; limit: number };
  essay: { used: number; limit: number };
  resume: { used: number; limit: number };
  cover_letter: { used: number; limit: number };
  estimated_cost_usd: number;
  monthly_budget_cap_usd: number;
  last_limit_reason: string;
  resetDate: string;
}

/**
 * Resolves the primary master account ID for family accounts so that linked
 * parents and students share the exact same AI quotas, spend tracker, and budget caps.
 */
export async function resolveMasterAccountId(userId: string): Promise<string> {
  try {
    const { getStudentDashboardData } = await import("@/services/data-fetcher");
    const dbData = await getStudentDashboardData(userId);
    return dbData.masterId || userId;
  } catch {
    return userId;
  }
}

/**
 * Computes the user's active billing / activation cycle and next refill date.
 * - Initial 7-Day Trial: Refills when trial ends & paid plan becomes active (e.g. Aug 24 signup -> Refill on Aug 31).
 * - Active Plan: Refills on the monthly renewal date (Stripe billing date or 30-day cycle).
 */
export async function getUserBillingCycleInfo(targetUserId: string): Promise<{
  cycleKey: string;
  resetDateFormatted: string;
  cycleEndDate: Date;
}> {
  const masterId = await resolveMasterAccountId(targetUserId);
  const supabaseAdmin = await createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("created_at, stripe_subscription_id, stripe_price_id, subscription_status")
    .eq("id", masterId)
    .maybeSingle();

  const now = new Date();

  // 1. If user has active Stripe subscription, retrieve official Stripe period
  if (profile?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-02-24.acacia" as any,
      });
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      const periodEndSec = (subscription as any).current_period_end;
      if (periodEndSec) {
        const cycleEndDate = new Date(periodEndSec * 1000);
        const periodStartSec = (subscription as any).current_period_start || (periodEndSec - 30 * 86400);
        const cycleStartDate = new Date(periodStartSec * 1000);
        
        return {
          cycleKey: `cycle-${cycleStartDate.toISOString().slice(0, 10)}-to-${cycleEndDate.toISOString().slice(0, 10)}`,
          resetDateFormatted: cycleEndDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          cycleEndDate,
        };
      }
    } catch (e) {
      console.warn("[getUserBillingCycleInfo] Stripe check fallback:", e);
    }
  }

  // 2. Trial & Non-Stripe users:
  // Use account created_at to determine 7-day trial end (plan activation date), and 30-day intervals thereafter.
  const createdAt = profile?.created_at ? new Date(profile.created_at) : now;
  const trialEndDate = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (now < trialEndDate) {
    // Currently inside the 7-day trial period:
    // Refill happens on trialEndDate when the plan becomes active!
    return {
      cycleKey: `trial-${createdAt.toISOString().slice(0, 10)}-to-${trialEndDate.toISOString().slice(0, 10)}`,
      resetDateFormatted: trialEndDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      cycleEndDate: trialEndDate,
    };
  }

  // If trial has passed, compute 30-day active monthly cycles from trialEndDate
  const msIn30Days = 30 * 24 * 60 * 60 * 1000;
  const elapsedSinceTrial = now.getTime() - trialEndDate.getTime();
  const cycleIndex = Math.floor(elapsedSinceTrial / msIn30Days);
  const currentCycleStart = new Date(trialEndDate.getTime() + cycleIndex * msIn30Days);
  const currentCycleEnd = new Date(currentCycleStart.getTime() + msIn30Days);

  return {
    cycleKey: `active-${currentCycleStart.toISOString().slice(0, 10)}-to-${currentCycleEnd.toISOString().slice(0, 10)}`,
    resetDateFormatted: currentCycleEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    cycleEndDate: currentCycleEnd,
  };
}

export function getCurrentMonthString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getNextResetDateString() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Records calculated AI dollar cost against user's active billing cycle tracker in ai_usage.
 */
export async function recordAiSpend(costUsd: number, targetUserId?: string): Promise<void> {
  if (costUsd <= 0) return;
  try {
    let rawUserId = targetUserId;
    if (!rawUserId) {
      const user = await getAuthenticatedUser();
      rawUserId = user?.id;
    }
    if (!rawUserId) return;

    const masterId = await resolveMasterAccountId(rawUserId);
    const supabaseAdmin = await createAdminClient();
    const cycleInfo = await getUserBillingCycleInfo(masterId);

    const { data: usageData } = await supabaseAdmin
      .from("ai_usage")
      .select("*")
      .eq("user_id", masterId)
      .maybeSingle();

    if (!usageData) {
      await supabaseAdmin.from("ai_usage").insert({
        user_id: masterId,
        current_month: cycleInfo.cycleKey,
        ask_ai_count: 0,
        essay_count: 0,
        resume_count: 0,
        cover_letter_count: 0,
        essay_docs_count: 0,
        resume_docs_count: 0,
        estimated_cost_usd: costUsd,
        last_limit_reason: "None",
      } as any);
    } else if (usageData.current_month !== cycleInfo.cycleKey) {
      await supabaseAdmin
        .from("ai_usage")
        .update({
          current_month: cycleInfo.cycleKey,
          ask_ai_count: 0,
          essay_count: 0,
          resume_count: 0,
          cover_letter_count: 0,
          essay_docs_count: 0,
          resume_docs_count: 0,
          estimated_cost_usd: costUsd,
          last_limit_reason: "None",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("user_id", masterId);
    } else {
      const currentCost = Number((usageData as any).estimated_cost_usd || 0);
      await supabaseAdmin
        .from("ai_usage")
        .update({
          estimated_cost_usd: currentCost + costUsd,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("user_id", masterId);
    }
  } catch (err) {
    console.error("[recordAiSpend] Error tracking spend:", err);
  }
}

/**
 * Enforces Document Creation Limits, Ask AI question click limits, and Hidden Backend Budget Caps.
 */
export async function enforceAiLimit(feature: AIFeature, targetUserId?: string): Promise<void> {
  let rawUserId = targetUserId;
  if (!rawUserId) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    rawUserId = user.id;
  }

  const masterId = await resolveMasterAccountId(rawUserId);
  const supabaseAdmin = await createAdminClient();

  // 1. Get user plan and billing cycle for the master household account
  const [subInfo, cycleInfo] = await Promise.all([
    getSubscriptionInfo(masterId),
    getUserBillingCycleInfo(masterId),
  ]);
  const plan = subInfo?.plan || "starter";

  // 2. Get global limits for this plan
  const { data: limitsData } = await supabaseAdmin
    .from("ai_limits")
    .select("*")
    .eq("plan", plan)
    .single();

  if (!limitsData) {
    throw new Error("Unable to fetch AI limits. Please contact support.");
  }

  const rawBudgetCap = (limitsData as any).monthly_budget_cap_usd;
  const budgetCap = Number(rawBudgetCap ?? (plan === "starter" ? 15 : plan === "scholar" ? 25 : 50));
  const resetDate = cycleInfo.resetDateFormatted;

  // 3. Get or create master user usage for current billing / activation cycle
  let { data: usageData } = await supabaseAdmin
    .from("ai_usage")
    .select("*")
    .eq("user_id", masterId)
    .maybeSingle();

  if (!usageData) {
    const { data: newUsage, error } = await supabaseAdmin
      .from("ai_usage")
      .insert({
        user_id: masterId,
        current_month: cycleInfo.cycleKey,
        ask_ai_count: 0,
        essay_count: 0,
        resume_count: 0,
        cover_letter_count: 0,
        essay_docs_count: 0,
        resume_docs_count: 0,
        estimated_cost_usd: 0,
        last_limit_reason: "None",
      } as any)
      .select()
      .single();

    if (error) throw new Error("Failed to initialize AI usage tracking");
    usageData = newUsage;
  } else if (usageData.current_month !== cycleInfo.cycleKey) {
    // Automatically refill counters and spend for the new active billing / plan cycle!
    const { data: resetUsage, error } = await supabaseAdmin
      .from("ai_usage")
      .update({
        current_month: cycleInfo.cycleKey,
        ask_ai_count: 0,
        essay_count: 0,
        resume_count: 0,
        cover_letter_count: 0,
        essay_docs_count: 0,
        resume_docs_count: 0,
        estimated_cost_usd: 0,
        last_limit_reason: "None",
        updated_at: new Date().toISOString(),
      } as any)
      .eq("user_id", masterId)
      .select()
      .single();

    if (error) throw new Error("Failed to reset AI usage for the active cycle");
    usageData = resetUsage;
  }

  const currentSpend = Number((usageData as any).estimated_cost_usd || 0);

  // 4. CHECK HIDDEN BACKEND BUDGET CAP FIRST (applies to all AI features across the shared account)
  if (currentSpend >= budgetCap) {
    await supabaseAdmin
      .from("ai_usage")
      .update({
        last_limit_reason: `Budget Cap reached ($${currentSpend.toFixed(2)} / $${budgetCap.toFixed(2)})`,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("user_id", masterId);

    // Standard friendly message (never reveals dollar amounts to user)
    throw new Error(
      `You have reached your monthly AI limit. Your access resets on ${resetDate}. Upgrade your plan for more access.`
    );
  }

  // 5. FEATURE-SPECIFIC LIMIT CHECKS (Shared across student & parent)
  const updatePayload: any = { 
    updated_at: new Date().toISOString(),
    last_limit_reason: "None"
  };

  if (feature === "ask_ai") {
    const askLimit = limitsData.ask_ai_limit;
    const askUsed = usageData.ask_ai_count || 0;
    if (askLimit < 900000 && askUsed >= askLimit) {
      await supabaseAdmin
        .from("ai_usage")
        .update({
          last_limit_reason: `Ask AI Question Limit (${askUsed}/${askLimit})`,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("user_id", masterId);

      throw new Error(
        `You have reached your monthly Ask Schoolari AI limit. Your access resets on ${resetDate}. Upgrade your plan for more access.`
      );
    }
    updatePayload.ask_ai_count = askUsed + 1;
  } else if (feature === "essay_doc_create") {
    const essayDocLimit = limitsData.essay_limit;
    const essayDocsUsed = (usageData as any).essay_docs_count || 0;
    if (essayDocLimit < 900000 && essayDocsUsed >= essayDocLimit) {
      await supabaseAdmin
        .from("ai_usage")
        .update({
          last_limit_reason: `Essay Document Limit (${essayDocsUsed}/${essayDocLimit})`,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("user_id", masterId);

      throw new Error(
        `You have reached your monthly essay document limit (${essayDocLimit} essays). Your access resets on ${resetDate}. Upgrade your plan for more access.`
      );
    }
    updatePayload.essay_docs_count = essayDocsUsed + 1;
  } else if (feature === "resume_doc_create") {
    const resumeDocLimit = limitsData.resume_limit;
    const resumeDocsUsed = (usageData as any).resume_docs_count || 0;
    if (resumeDocLimit < 900000 && resumeDocsUsed >= resumeDocLimit) {
      await supabaseAdmin
        .from("ai_usage")
        .update({
          last_limit_reason: `Resume Document Limit (${resumeDocsUsed}/${resumeDocLimit})`,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("user_id", masterId);

      throw new Error(
        `You have reached your monthly resume document limit (${resumeDocLimit} resumes). Your access resets on ${resetDate}. Upgrade your plan for more access.`
      );
    }
    updatePayload.resume_docs_count = resumeDocsUsed + 1;
  } else if (feature === "cover_letter") {
    const coverLimit = limitsData.cover_letter_limit;
    const coverUsed = usageData.cover_letter_count || 0;
    if (coverLimit < 900000 && coverUsed >= coverLimit) {
      await supabaseAdmin
        .from("ai_usage")
        .update({
          last_limit_reason: `Cover Letter Limit (${coverUsed}/${coverLimit})`,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("user_id", masterId);

      throw new Error(
        `You have reached your monthly cover letter limit. Your access resets on ${resetDate}. Upgrade your plan for more access.`
      );
    }
    updatePayload.cover_letter_count = coverUsed + 1;
  }
  // Note: in-document refinement tools ("essay_tool", "resume_tool") are UNLIMITED within documents (only subject to budget cap above)

  await supabaseAdmin
    .from("ai_usage")
    .update(updatePayload as any)
    .eq("user_id", masterId);
}

/**
 * Checks if a user is allowed to create a new document without incrementing the counter yet.
 */
export async function checkDocumentCreationLimit(
  feature: "essay" | "resume",
  targetUserId?: string
): Promise<{ canCreate: boolean; used: number; limit: number; resetDate: string; error?: string }> {
  try {
    let rawUserId = targetUserId;
    if (!rawUserId) {
      const user = await getAuthenticatedUser();
      if (!user) return { canCreate: false, used: 0, limit: 0, resetDate: "", error: "Unauthorized" };
      rawUserId = user.id;
    }

    const masterId = await resolveMasterAccountId(rawUserId);
    const supabaseAdmin = await createAdminClient();
    const [subInfo, cycleInfo] = await Promise.all([
      getSubscriptionInfo(masterId),
      getUserBillingCycleInfo(masterId),
    ]);
    const plan = subInfo?.plan || "starter";

    const { data: limitsData } = await supabaseAdmin
      .from("ai_limits")
      .select("*")
      .eq("plan", plan)
      .single();

    const resetDate = cycleInfo.resetDateFormatted;
    if (!limitsData) return { canCreate: true, used: 0, limit: 999999, resetDate };

    const rawBudgetCap = (limitsData as any).monthly_budget_cap_usd;
    const budgetCap = Number(rawBudgetCap ?? (plan === "starter" ? 15 : plan === "scholar" ? 25 : 50));

    const { data: usageData } = await supabaseAdmin
      .from("ai_usage")
      .select("*")
      .eq("user_id", masterId)
      .maybeSingle();

    if (!usageData || usageData.current_month !== cycleInfo.cycleKey) {
      const limit = feature === "essay" ? limitsData.essay_limit : limitsData.resume_limit;
      return { canCreate: true, used: 0, limit, resetDate };
    }

    const currentSpend = Number((usageData as any).estimated_cost_usd || 0);
    if (currentSpend >= budgetCap) {
      return {
        canCreate: false,
        used: feature === "essay" ? (usageData as any).essay_docs_count || 0 : (usageData as any).resume_docs_count || 0,
        limit: feature === "essay" ? limitsData.essay_limit : limitsData.resume_limit,
        resetDate,
        error: `You have reached your monthly AI limit. Your access resets on ${resetDate}. Upgrade your plan for more access.`,
      };
    }

    const used = feature === "essay" ? (usageData as any).essay_docs_count || 0 : (usageData as any).resume_docs_count || 0;
    const limit = feature === "essay" ? limitsData.essay_limit : limitsData.resume_limit;

    if (limit < 900000 && used >= limit) {
      return {
        canCreate: false,
        used,
        limit,
        resetDate,
        error: `You have reached your monthly ${feature} document limit (${limit} ${feature}s). Your access resets on ${resetDate}. Upgrade your plan for more access.`,
      };
    }

    return { canCreate: true, used, limit, resetDate };
  } catch (err: any) {
    console.error("[checkDocumentCreationLimit] Error:", err);
    return { canCreate: true, used: 0, limit: 999999, resetDate: getNextResetDateString() };
  }
}

/**
 * Gets clean AI usage metrics for dashboard and profile displays (no sensitive cost numbers shown to user).
 */
export async function getUserAiUsage(targetUserId?: string): Promise<AIUsageData | null> {
  let rawUserId = targetUserId;
  if (!rawUserId) {
    const user = await getAuthenticatedUser();
    if (!user) return null;
    rawUserId = user.id;
  }

  const masterId = await resolveMasterAccountId(rawUserId);
  const supabaseAdmin = await createAdminClient();
  const [subInfo, cycleInfo] = await Promise.all([
    getSubscriptionInfo(masterId),
    getUserBillingCycleInfo(masterId),
  ]);
  const plan = subInfo?.plan || "starter";

  const { data: limitsData } = await supabaseAdmin
    .from("ai_limits")
    .select("*")
    .eq("plan", plan)
    .single();

  if (!limitsData) return null;

  let { data: usageData } = await supabaseAdmin
    .from("ai_usage")
    .select("*")
    .eq("user_id", masterId)
    .maybeSingle();

  if (!usageData || usageData.current_month !== cycleInfo.cycleKey) {
    usageData = {
      ask_ai_count: 0,
      essay_count: 0,
      resume_count: 0,
      cover_letter_count: 0,
      essay_docs_count: 0,
      resume_docs_count: 0,
      estimated_cost_usd: 0,
      last_limit_reason: "None",
    } as any;
  }

  const resetDate = cycleInfo.resetDateFormatted;
  const rawBudgetCap = (limitsData as any).monthly_budget_cap_usd;

  return {
    plan,
    ask_ai: { used: usageData!.ask_ai_count || 0, limit: limitsData.ask_ai_limit },
    essay: { used: (usageData as any).essay_docs_count || 0, limit: limitsData.essay_limit },
    resume: { used: (usageData as any).resume_docs_count || 0, limit: limitsData.resume_limit },
    cover_letter: { used: usageData!.cover_letter_count || 0, limit: limitsData.cover_letter_limit },
    estimated_cost_usd: Number((usageData as any).estimated_cost_usd || 0),
    monthly_budget_cap_usd: Number(rawBudgetCap ?? (plan === "starter" ? 15 : plan === "scholar" ? 25 : 50)),
    last_limit_reason: (usageData as any).last_limit_reason || "None",
    resetDate,
  };
}
