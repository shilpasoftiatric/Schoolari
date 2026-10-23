// ─────────────────────────────────────────────────────────────
// subscription.ts — CLIENT-SAFE only. No server imports.
// Server-only functions (getUserPlan, requireFeatureAccess) live
// in @/lib/subscription-server.ts
// ─────────────────────────────────────────────────────────────

// Plan tiers
export type SubscriptionPlan = "starter" | "scholar" | "elite" | null;

// Feature IDs
export type SubscriptionFeature =
  | "dashboard"
  | "scholarships"
  | "colleges"
  | "documents"
  | "tracker"
  | "essays"
  | "resume"
  | "jobs"
  | "income"
  | "coaching"
  | "messages";

// Feature-to-plan access map
const featureAccessMap: Record<SubscriptionFeature, SubscriptionPlan[]> = {
  dashboard:    ["starter", "scholar", "elite"],
  scholarships: ["starter", "scholar", "elite"],
  colleges:     ["starter", "scholar", "elite"],
  documents:    ["starter", "scholar", "elite"],
  tracker:      ["starter", "scholar", "elite"],
  essays:       ["starter", "scholar", "elite"],
  resume:       ["scholar", "elite"],
  jobs:         ["scholar", "elite"],
  income:       ["scholar", "elite"],
  coaching:     ["elite"],
  messages:     ["elite"],
};

// Human-readable plan names and pricing
export const PLAN_INFO: Record<
  NonNullable<SubscriptionPlan>,
  { label: string; price: string; features: string[] }
> = {
  starter: {
    label: "Starter",
    price: "$29/mo",
    features: [
      "Scholarship Search, Save & Apply",
      "Scholarship Tracker",
      "AI College Match",
      "Document Vault",
      "Member Dashboard & Analytics",
      "AI Essay Workspace (Limited Usage)",
    ],
  },
  scholar: {
    label: "Scholar",
    price: "$49/mo",
    features: [
      "Everything in Starter",
      "AI Essay Help & Workspace",
      "Harvard ATS Resume Builder",
      "Jobs & Internships Feed",
      "Earn While You Learn Videos",
    ],
  },
  elite: {
    label: "Elite",
    price: "$99/mo",
    features: [
      "Everything in Scholar",
      "1-on-1 Coach / Mentor Access",
      "Direct Messaging with Coach",
      "Done-With-You Support",
      "Priority Response",
    ],
  },
};

// Map price IDs to plan tiers (uses NEXT_PUBLIC_ vars — safe on client)
export function getPlanFromPriceId(priceId: string | null | undefined): SubscriptionPlan {
  if (!priceId) return null;
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_SCHOLAR) return "scholar";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE)   return "elite";
  return null;
}

// Resolves effective plan for a profile, accounting for discount code Starter users
export function resolveUserPlan(
  profile: {
    is_discount_user?: boolean | null;
    subscription_status?: string | null;
    stripe_price_id?: string | null;
  } | null | undefined
): SubscriptionPlan {
  if (!profile) return null;
  if (
    profile.subscription_status !== "active" &&
    profile.subscription_status !== "trialing"
  ) {
    return null;
  }
  if (profile.is_discount_user) {
    return "starter";
  }
  return getPlanFromPriceId(profile.stripe_price_id ?? null);
}

// Check if a plan can access a feature
export function canAccessFeature(plan: SubscriptionPlan, feature: SubscriptionFeature): boolean {
  if (!plan) return false;
  return (featureAccessMap[feature] as SubscriptionPlan[]).includes(plan);
}

// Get the minimum plan required for a feature
export function getMinPlanForFeature(feature: SubscriptionFeature): NonNullable<SubscriptionPlan> {
  const plans: NonNullable<SubscriptionPlan>[] = ["starter", "scholar", "elite"];
  for (const plan of plans) {
    if ((featureAccessMap[feature] as SubscriptionPlan[]).includes(plan)) return plan;
  }
  return "elite";
}
