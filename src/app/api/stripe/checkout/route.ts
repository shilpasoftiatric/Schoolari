import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

let stripe: Stripe | null = null;

function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia" as any,
    });
  }
  return stripe;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
    }

    // Fetch full dashboard/profile data using data-fetcher (bypasses RLS, resolves linked student/parent)
    const { getStudentDashboardData } = await import("@/services/data-fetcher");
    const dbData = await getStudentDashboardData(user.id);
    const userProfile = dbData.userProfile;
    const masterProfile = dbData.profile;

    // Check if the current user profile or linked master profile has had a trial or subscription
    const hasHadTrial = 
      !!userProfile?.trial_start_date || 
      !!userProfile?.subscription_status ||
      !!userProfile?.stripe_subscription_id ||
      !!userProfile?.stripe_customer_id ||
      !!userProfile?.trial_welcome_email_sent ||
      !!userProfile?.trial_cancelled_email_sent ||
      !!masterProfile?.trial_start_date ||
      !!masterProfile?.subscription_status ||
      !!masterProfile?.stripe_subscription_id ||
      !!masterProfile?.stripe_customer_id ||
      !!masterProfile?.trial_welcome_email_sent ||
      !!masterProfile?.trial_cancelled_email_sent;

    const existingCustomerId = userProfile?.stripe_customer_id || masterProfile?.stripe_customer_id || undefined;
    const ownerId = dbData.subscriptionOwnerId || user.id;

    console.log("=== DEBUG CHECKOUT ===");
    console.log("User ID:", user.id);
    console.log("Account Type:", userProfile?.account_type);
    console.log("Existing Customer ID:", existingCustomerId);
    console.log("hasHadTrial Evaluated to:", hasHadTrial);

    // Prefer the request origin so the user is returned to the EXACT domain they started from (e.g., localhost vs member.localhost)
    const appUrl = requestOrigin(req) || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${appUrl}/api/stripe/verify?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/pricing?canceled=true`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      ...(hasHadTrial ? {} : {
        subscription_data: {
          trial_period_days: 7,
        }
      }),
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id, // Links payment to the active user
      customer_email: existingCustomerId ? undefined : (user.email || userProfile?.student_email || userProfile?.parent_email || undefined),
      customer: existingCustomerId, // Use existing customer ID if present to prevent creating duplicates
    };
    console.log("Session Params we are sending to Stripe:", JSON.stringify(sessionParams, null, 2));

    const stripeClient = getStripe();
    const session = await stripeClient.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

function requestOrigin(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${forwardedProto}://${host}`;
}
