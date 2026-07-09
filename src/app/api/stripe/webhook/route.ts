import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

let stripe: Stripe | null = null;
let supabaseAdmin: any = null;

function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia" as any,
    });
  }
  return stripe;
}

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials for Admin");
    }
    supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabaseAdmin;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature found" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    }
    const stripeClient = getStripe();
    event = stripeClient.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // This is the user.id we passed from our checkout route
        const userId = session.client_reference_id; 
        if (!userId) {
          throw new Error("No client_reference_id found in session");
        }

        // Retrieve subscription details
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;
        
        // We might want to retrieve the actual subscription object to get the price
        const stripeClient = getStripe();
        const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        // Update the Supabase profile
        const adminClient = getSupabaseAdmin();
        const { error } = await adminClient
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            subscription_status: subscription.status, // e.g. "active"
          })
          .eq("id", userId);

        if (error) {
          console.error("Failed to update user profile with subscription:", error);
          throw error;
        }
        break;
      }
      
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find the user by subscription ID and update their status
        const adminClient = getSupabaseAdmin();
        const { error } = await adminClient
          .from("profiles")
          .update({
            subscription_status: subscription.status,
            stripe_price_id: subscription.items.data[0].price.id,
          })
          .eq("stripe_subscription_id", subscription.id);
          
        if (error) {
          console.error("Failed to update subscription status:", error);
          throw error;
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
