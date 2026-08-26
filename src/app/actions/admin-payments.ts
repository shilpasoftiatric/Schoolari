"use server";

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/app/actions/admin";
import { revalidatePath } from "next/cache";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia" as any,
  });
}

import { mirrorStripeSubscription } from "@/lib/stripe-mirror";

/**
 * Cancel a user's subscription immediately in Stripe + update DB
 */
export async function cancelSubscription(stripeSubscriptionId: string, userId: string) {
  await requirePermission("manage_payments");
  const stripe = getStripe();

  const deleted = await stripe.subscriptions.cancel(stripeSubscriptionId);

  const adminClient = await createAdminClient();
  const updateFields = {
    subscription_status: "canceled",
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_customer_id: null,
    trial_cancelled_email_sent: true,
  };

  await adminClient
    .from("profiles")
    .update(updateFields)
    .eq("stripe_subscription_id", stripeSubscriptionId);

  await mirrorStripeSubscription(userId, updateFields);

  revalidatePath("/admin/payments");
  return { success: true, status: deleted.status };
}

/**
 * Issue a full or partial refund on a Stripe PaymentIntent
 */
export async function issueRefund(paymentIntentId: string, amountCents?: number) {
  await requirePermission("manage_payments");
  const stripe = getStripe();

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amountCents ? { amount: amountCents } : {}),
  });

  return { success: true, refundId: refund.id, status: refund.status };
}

/**
 * Change a user's subscription plan (upgrade/downgrade)
 */
export async function changeSubscriptionPlan(
  stripeSubscriptionId: string,
  newPriceId: string,
  userId: string
) {
  await requirePermission("manage_payments");
  const stripe = getStripe();

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const subscriptionItemId = subscription.items.data[0].id;

  const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [{ id: subscriptionItemId, price: newPriceId }],
    proration_behavior: "create_prorations",
  });

  const adminClient = await createAdminClient();
  await adminClient
    .from("profiles")
    .update({
      stripe_price_id: newPriceId,
      subscription_status: updated.status,
    })
    .eq("id", userId);

  revalidatePath("/admin/payments");
  return { success: true };
}

/**
 * Create a coupon in Stripe
 */
export async function createCoupon(data: {
  name: string;
  percentOff?: number;
  amountOff?: number;
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number;
  maxRedemptions?: number;
}) {
  await requirePermission("manage_payments");
  const stripe = getStripe();

  const coupon = await stripe.coupons.create({
    name: data.name,
    ...(data.percentOff ? { percent_off: data.percentOff } : {}),
    ...(data.amountOff ? { amount_off: data.amountOff * 100, currency: "usd" } : {}),
    duration: data.duration,
    ...(data.duration === "repeating" && data.durationInMonths
      ? { duration_in_months: data.durationInMonths }
      : {}),
    ...(data.maxRedemptions ? { max_redemptions: data.maxRedemptions } : {}),
  });

  return { success: true, couponId: coupon.id };
}

/**
 * Delete a coupon from Stripe
 */
export async function deleteCoupon(couponId: string) {
  await requirePermission("manage_payments");
  const stripe = getStripe();
  await stripe.coupons.del(couponId);
  return { success: true };
}
