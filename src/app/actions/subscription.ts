"use server";

import Stripe from "stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getPlanFromPriceId, PLAN_INFO } from "@/lib/subscription-server";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia" as any,
  });
}

/**
 * Self-service plan upgrade via Stripe subscription update.
 * Users can upgrade from their current plan to a higher one.
 */
export async function upgradeSubscriptionPlan(newPriceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, stripe_price_id, subscription_status")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  if (!profile.stripe_subscription_id) {
    throw new Error("No active subscription found. Please subscribe first.");
  }

  const currentPlan = getPlanFromPriceId(profile.stripe_price_id);
  const newPlan = getPlanFromPriceId(newPriceId);

  if (!newPlan) throw new Error("Invalid plan selected.");
  if (currentPlan === newPlan) throw new Error("You are already on this plan.");

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  const subscriptionItemId = subscription.items.data[0].id;
  const oldInvoiceId = typeof subscription.latest_invoice === 'string' 
    ? subscription.latest_invoice 
    : subscription.latest_invoice?.id;

  try {
    const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [{ id: subscriptionItemId, price: newPriceId }],
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete", // Require payment but allow us to send them to invoice url
      expand: ["latest_invoice"],
    });

    const latestInvoice = updated.latest_invoice as Stripe.Invoice;

    // If the invoice requires payment (open status)
    if (latestInvoice && latestInvoice.status === "open") {
      if (latestInvoice.hosted_invoice_url) {
        return {
          success: true,
          requiresPayment: true,
          paymentUrl: latestInvoice.hosted_invoice_url,
        };
      } else {
        // Edge case: invoice is open but no URL is available
        throw new Error("Payment is required but the invoice URL could not be generated.");
      }
    }

    // Otherwise, the upgrade was fully covered (e.g. $0) or auto-charged successfully.
    // If the invoice ID hasn't changed, Stripe didn't generate a new invoice (proration was $0).
    const isNewInvoice = latestInvoice && latestInvoice.id !== oldInvoiceId;
    const amountPaid = isNewInvoice ? latestInvoice.amount_paid : 0;

    const adminClient = await createAdminClient();
    await adminClient
      .from("profiles")
      .update({
        stripe_price_id: newPriceId,
        subscription_status: updated.status,
      })
      .eq("id", user.id);

    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return {
      success: true,
      requiresPayment: false,
      newPlan: PLAN_INFO[newPlan].label,
      status: updated.status,
      amountPaid,
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to upgrade subscription. Please check your payment method.");
  }
}

/**
 * Preview the exact prorated amount for upgrading to a new plan.
 */
export async function getUpgradePreview(targetPriceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_subscription_id || !profile?.stripe_customer_id) {
    throw new Error("No active subscription");
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  const subscriptionItemId = subscription.items.data[0].id;

  try {
    const invoice = await stripe.invoices.createPreview({
      customer: profile.stripe_customer_id,
      subscription: profile.stripe_subscription_id,
      subscription_details: {
        proration_behavior: "always_invoice",
        items: [{
          id: subscriptionItemId,
          price: targetPriceId,
        }],
      }
    });

    return {
      amountDue: invoice.amount_due,
      subtotal: invoice.subtotal,
      nextBillingDate: new Date((subscription as any).current_period_end * 1000).toISOString(),
    };
  } catch (err: any) {
    console.error("Preview error:", err);
    throw new Error("Could not fetch pricing preview. " + err.message);
  }
}

/**
 * Schedule an upgrade for the next billing cycle using Stripe Subscription Schedules.
 */
export async function scheduleSubscriptionUpgrade(targetPriceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    throw new Error("No active subscription");
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);

  // If a schedule already exists, we use it, otherwise create a new one from the subscription
  let scheduleId = subscription.schedule as string;
  let schedule;

  if (!scheduleId) {
    schedule = await stripe.subscriptionSchedules.create({
      from_subscription: subscription.id,
    });
  } else {
    schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  }

  const currentPhase = schedule.phases[0]; // The active phase

  // If there's already a future phase, check if it's the exact same plan
  if (schedule.phases.length > 1) {
    const futurePhase = schedule.phases[1];
    const futurePriceId = typeof futurePhase.items[0].price === 'string' 
      ? futurePhase.items[0].price 
      : futurePhase.items[0].price.id;
    
    if (futurePriceId === targetPriceId) {
      throw new Error("You already have an upgrade to this plan scheduled for your next billing cycle.");
    }
  }

  // Update schedule to transition to the new plan at the end of the active phase
  try {
    await stripe.subscriptionSchedules.update(schedule.id, {
      phases: [
        {
          end_date: currentPhase.end_date,
          items: currentPhase.items.map(item => ({ 
            price: typeof item.price === 'string' ? item.price : item.price.id, 
            quantity: item.quantity || 1 
          })),
        },
        {
          items: [{ price: targetPriceId, quantity: 1 }],
        }
      ]
    });
  } catch (err: any) {
    console.error("Schedule update error:", err);
    if (err.message && err.message.includes("missing at least one phase with a `start_date`")) {
      throw new Error("You already have a pending plan change scheduled. Please wait for your next billing cycle.");
    }
    throw new Error(
      "We couldn't schedule your upgrade. " + 
      (err.message || "Please contact support.")
    );
  }

  return { success: true };
}

/**
 * Get current subscription info for the profile page.
 * Returns plan label, renewal date, and status.
 */
export async function getSubscriptionInfo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, stripe_price_id, subscription_status")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const plan = getPlanFromPriceId(profile.stripe_price_id);
  let renewalDate: string | null = null;

  if (profile.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      renewalDate = new Date((subscription as any).current_period_end * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      // Non-critical; silently fail
    }
  }

  return {
    plan,
    planInfo: plan ? PLAN_INFO[plan] : null,
    status: profile.subscription_status,
    renewalDate,
    hasSubscription: !!profile.stripe_subscription_id,
  };
}

