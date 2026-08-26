import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

import { getSupabaseAdmin, mirrorStripeSubscription } from "@/lib/stripe-mirror";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  // Keep the user on the same domain they verified from (e.g. localhost:3000 instead of members.localhost:3000)
  // This ensures they don't lose their auth cookies during local development.
  const appUrl = new URL(req.url).origin;

  if (!sessionId) {
    return NextResponse.redirect(`${appUrl}/pricing?error=No session ID provided`);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Ensure it's paid or a free trial
    if (session.payment_status === "paid" || session.payment_status === "no_payment_required" || session.payment_status === "unpaid") {
      const userId = session.client_reference_id;
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        const stripePayload: any = {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          subscription_status: subscription.status, // Should be "active" or "trialing"
        };

        if (subscription.status === "trialing") {
          stripePayload.trial_start_date = new Date().toISOString();
        }

        // 1. Save Stripe data to the payer's own profile (parent OR student)
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .upsert({ id: userId, ...stripePayload }, { onConflict: "id" })
          .select()
          .single();

        // 2. Mirror to linked family members
        await mirrorStripeSubscription(userId, stripePayload);
      }

      // Redirect successfully to onboarding using a standard redirect
      // Now that appUrl correctly includes the subdomain (e.g. members.localhost), 
      // the browser will stay on the same origin and send the auth cookies properly.
      return NextResponse.redirect(`${appUrl}/onboarding?payment_success=true`);
    } else {
      // Payment failed or incomplete
      return NextResponse.redirect(`${appUrl}/pricing?canceled=true`);
    }
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(`${appUrl}/pricing?error=Verification_failed`);
  }
}
