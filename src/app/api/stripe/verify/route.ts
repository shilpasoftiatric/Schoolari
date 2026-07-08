import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin(req);

  if (!sessionId) {
    return NextResponse.redirect(`${appUrl}/pricing?error=No session ID provided`);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Ensure it's paid
    if (session.payment_status === "paid") {
      const userId = session.client_reference_id;
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        // Force synchronous update in database so middleware lets them through
        await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            subscription_status: subscription.status, // Should be "active" or "trialing"
          })
          .eq("id", userId);
      }
      
      // Redirect successfully to onboarding
      return NextResponse.redirect(`${appUrl}/onboarding?payment_success=true`);
    } else {
      // Payment failed or incomplete
      return NextResponse.redirect(`${appUrl}/pricing?canceled=true`);
    }
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(`${appUrl}/pricing?error=Verification failed`);
  }
}

function requestOrigin(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${forwardedProto}://${host}`;
}
