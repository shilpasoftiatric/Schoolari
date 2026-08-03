// ─────────────────────────────────────────────────────────────
// subscription-server.ts — SERVER ONLY. Uses next/headers via createClient.
// Do NOT import this from client components.
// ─────────────────────────────────────────────────────────────

import { createClient } from "@/lib/supabase/server";
import {
  getPlanFromPriceId,
  canAccessFeature,
  getMinPlanForFeature,
  PLAN_INFO,
} from "@/lib/subscription";
import type { SubscriptionPlan, SubscriptionFeature } from "@/lib/subscription";

export type { SubscriptionPlan, SubscriptionFeature };
export { getPlanFromPriceId, canAccessFeature, getMinPlanForFeature, PLAN_INFO };

// Server-side: get current user plan
export async function getUserPlan(): Promise<SubscriptionPlan> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_price_id, subscription_status")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  if (
    profile.subscription_status !== "active" &&
    profile.subscription_status !== "trialing"
  ) {
    return null;
  }

  return getPlanFromPriceId(profile.stripe_price_id);
}

// Server-side: throw if user cannot access a feature
export async function requireFeatureAccess(feature: SubscriptionFeature): Promise<SubscriptionPlan> {
  const plan = await getUserPlan();
  if (!canAccessFeature(plan, feature)) {
    throw new Error(
      `Access denied. The "${feature}" feature requires the ${PLAN_INFO[getMinPlanForFeature(feature)].label} plan or higher.`
    );
  }
  return plan;
}
