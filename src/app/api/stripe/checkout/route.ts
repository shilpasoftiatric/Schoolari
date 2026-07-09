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

    // Get the user's email and name to pre-fill the checkout
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, stripe_customer_id")
      .eq("id", user.id)
      .single();

    // Setup success/cancel URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin(req);
    const successUrl = `${appUrl}/api/stripe/verify?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/pricing?canceled=true`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id, // VERY IMPORTANT: links payment to Supabase user
      customer_email: profile?.stripe_customer_id ? undefined : user.email,
      customer: profile?.stripe_customer_id || undefined, // Use existing customer if present
    };

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
