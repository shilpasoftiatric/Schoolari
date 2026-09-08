import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { PaymentsAdmin } from "./PaymentsAdmin";
import { CreditCard } from "lucide-react";
import { getPlanFromPriceId } from "@/lib/subscription";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia" as any,
  });
}

// Map Stripe Price ID → friendly plan name
const PLAN_NAMES: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || ""]: "Starter ($29/mo)",
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_SCHOLAR || ""]: "Scholar ($49/mo)",
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || ""]: "Elite ($99/mo)",
};

function getFriendlyPlanName(priceId: string | null | undefined): string {
  if (!priceId) return "Custom Plan";
  if (PLAN_NAMES[priceId]) return PLAN_NAMES[priceId];
  const plan = getPlanFromPriceId(priceId);
  if (plan === "elite") return "Elite ($99/mo)";
  if (plan === "scholar") return "Scholar ($49/mo)";
  if (plan === "starter") return "Starter ($29/mo)";
  return "Custom Plan";
}

// Project Launch Cutoff Date
// Only transactions created on or after this timestamp belong to the live Schoolari platform.
const STRIPE_LAUNCH_DATE_STR = process.env.STRIPE_LAUNCH_DATE || "2026-09-01T00:00:00Z";
const STRIPE_LAUNCH_TIMESTAMP = Math.floor(new Date(STRIPE_LAUNCH_DATE_STR).getTime() / 1000);

export default async function AdminPaymentsPage() {
  const adminClient = await createAdminClient();
  const stripe = getStripe();

  // Fetch all profiles and auth users to resolve student-parent cross-linking & auth details
  const [
    { data: profiles },
    { data: authData },
  ] = await Promise.all([
    adminClient.from("profiles").select("*").order("created_at", { ascending: false }),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const authUsers = authData?.users || [];
  const authUserMap = new Map<string, any>();
  authUsers.forEach((u) => authUserMap.set(u.id, u));

  const profileMap = new Map<string, any>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p));

  // 1. Cross-linking pass: if parent holds Stripe data, mirror it onto the student profile in memory
  (profiles || []).forEach((profile) => {
    if (profile.account_type === "parent") {
      let student = profile.linked_student_id ? profileMap.get(profile.linked_student_id) : null;
      if (!student && profile.parent_email) {
        const pEmail = profile.parent_email.toLowerCase().trim();
        student = (profiles || []).find(
          (sp) => sp.account_type !== "parent" && (sp.parent_email || "").toLowerCase().trim() === pEmail
        );
      }

      if (student) {
        // If parent has active/trialing/canceled stripe subscription and student doesn't, inherit it
        const parentHasStripe = Boolean(profile.stripe_subscription_id);
        const studentHasStripe = Boolean(student.stripe_subscription_id);

        if (parentHasStripe && !studentHasStripe) {
          student.stripe_customer_id = profile.stripe_customer_id;
          student.stripe_subscription_id = profile.stripe_subscription_id;
          student.stripe_price_id = profile.stripe_price_id;
          student.subscription_status = profile.subscription_status;
          student._subscription_owner_id = profile.id;
        }
      }
    }
  });

  // 2. Build list of subscribers strictly showing Students / Members (never separate parent rows for linked families)
  const subscribers: any[] = [];
  const seenSubIds = new Set<string>();

  (profiles || []).forEach((p) => {
    const isStaff =
      ["super_admin", "admin", "college_coach", "essay_coach", "content_manager", "customer_support"].includes(p.role) ||
      p.account_type === "staff";
    if (isStaff) return;

    // If this profile is a parent linked to a student, do NOT render as a separate subscription row
    if (p.account_type === "parent") {
      const isLinked = Boolean(
        p.linked_student_id ||
        (p.parent_email &&
          (profiles || []).some(
            (sp) => sp.account_type !== "parent" && (sp.parent_email || "").toLowerCase().trim() === (p.parent_email || "").toLowerCase().trim()
          ))
      );
      if (isLinked) return;
    }

    // Must have a Stripe subscription ID
    if (!p.stripe_subscription_id) return;

    // Deduplicate so duplicate family entries don't render twice
    if (seenSubIds.has(p.stripe_subscription_id)) return;
    seenSubIds.add(p.stripe_subscription_id);

    const authUser = authUserMap.get(p.id);

    const fullName =
      [p.student_first_name, p.student_last_name].filter(Boolean).join(" ") ||
      p.first_name ||
      [p.parent_first_name, p.parent_last_name].filter(Boolean).join(" ") ||
      authUser?.user_metadata?.full_name ||
      authUser?.email?.split("@")[0] ||
      "Student Member";

    const email = p.student_email || p.parent_email || authUser?.email || "";

    subscribers.push({
      ...p,
      plan_name: getFriendlyPlanName(p.stripe_price_id),
      display_name: fullName,
      display_email: email,
    });
  });

  // Set of customer IDs registered in Schoolari
  const schoolariCustomerIds = new Set(
    subscribers
      .map((s) => s.stripe_customer_id)
      .filter(Boolean)
  );

  // Fetch recent charges from Stripe (for payment history)
  let recentCharges: any[] = [];
  let coupons: any[] = [];

  if (stripe) {
    try {
      const [chargesRes, couponsRes] = await Promise.all([
        stripe.charges.list({
          limit: 100,
          created: { gte: STRIPE_LAUNCH_TIMESTAMP },
        }),
        stripe.coupons.list({ limit: 50 }),
      ]);

      // Filter charges: ensure created on or after launch date AND belong to a Schoolari customer
      recentCharges = (chargesRes.data || []).filter((charge) => {
        const isAfterLaunch = charge.created >= STRIPE_LAUNCH_TIMESTAMP;
        if (!isAfterLaunch) return false;

        if (charge.customer && typeof charge.customer === "string" && schoolariCustomerIds.size > 0) {
          return schoolariCustomerIds.has(charge.customer);
        }
        return true;
      });

      coupons = couponsRes.data;
    } catch (e) {
      console.error("Stripe data fetch error:", e);
    }
  }

  // Stats
  const activeCount = subscribers.filter((s) => s.subscription_status === "active" || s.subscription_status === "trialing").length;
  const canceledCount = subscribers.filter((s) => s.subscription_status === "canceled").length;
  const totalRevenue = recentCharges
    .filter((c) => c.status === "succeeded")
    .reduce((sum, c) => sum + c.amount, 0);

  const availablePlans = [
    { priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "", name: "Starter ($29/mo)" },
    { priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCHOLAR || "", name: "Scholar ($49/mo)" },
    { priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || "", name: "Elite ($99/mo)" },
  ].filter((p) => p.priceId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-600" />
          Payments & Memberships
        </h1>
        <p className="text-slate-500 mt-1">
          View subscriptions, manage plans, process refunds, and manage coupons.
        </p>
      </div>

      <PaymentsAdmin
        subscribers={subscribers}
        recentCharges={recentCharges}
        coupons={coupons}
        stats={{ active: activeCount, canceled: canceledCount, totalRevenueCents: totalRevenue }}
        availablePlans={availablePlans}
        stripeConfigured={!!stripe}
      />
    </div>
  );
}
