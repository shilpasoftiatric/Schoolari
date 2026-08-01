import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { PaymentsAdmin } from "./PaymentsAdmin";
import { CreditCard } from "lucide-react";

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

export default async function AdminPaymentsPage() {
  const adminClient = await createAdminClient();
  const stripe = getStripe();

  // Fetch all subscribers from DB
  const { data: subscribers } = await adminClient
    .from("profiles")
    .select(
      "id, student_first_name, student_last_name, student_email, first_name, parent_first_name, parent_last_name, parent_email, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status, created_at"
    )
    .not("stripe_subscription_id", "is", null)
    .order("created_at", { ascending: false });

  // Fetch recent charges from Stripe (for payment history)
  let recentCharges: any[] = [];
  let coupons: any[] = [];

  if (stripe) {
    try {
      const [chargesRes, couponsRes] = await Promise.all([
        stripe.charges.list({ limit: 50 }),
        stripe.coupons.list({ limit: 50 }),
      ]);
      recentCharges = chargesRes.data;
      coupons = couponsRes.data;
    } catch (e) {
      console.error("Stripe data fetch error:", e);
    }
  }

  // Stats
  const activeCount = subscribers?.filter((s) => s.subscription_status === "active").length || 0;
  const canceledCount = subscribers?.filter((s) => s.subscription_status === "canceled").length || 0;
  const totalRevenue = recentCharges
    .filter((c) => c.status === "succeeded")
    .reduce((sum, c) => sum + c.amount, 0);

  // Enrich subscribers with plan names
  const enriched = (subscribers || []).map((s) => ({
    ...s,
    plan_name: PLAN_NAMES[s.stripe_price_id || ""] || "Unknown Plan",
    display_name: s.student_first_name
      ? `${s.student_first_name} ${s.student_last_name || ""}`
      : `${s.first_name || s.parent_first_name || ""} ${s.parent_last_name || ""}`.trim() || "Unknown",
    display_email: s.student_email || s.parent_email || "",
  }));

  const availablePlans = Object.entries(PLAN_NAMES)
    .filter(([k]) => k)
    .map(([priceId, name]) => ({ priceId, name }));

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
        subscribers={enriched}
        recentCharges={recentCharges}
        coupons={coupons}
        stats={{ active: activeCount, canceled: canceledCount, totalRevenueCents: totalRevenue }}
        availablePlans={availablePlans}
        stripeConfigured={!!stripe}
      />
    </div>
  );
}
