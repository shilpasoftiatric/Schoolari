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

  const codeId = data.name.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, "");

  const coupon = await stripe.coupons.create({
    id: codeId || undefined,
    name: data.name,
    ...(data.percentOff ? { percent_off: data.percentOff } : {}),
    ...(data.amountOff ? { amount_off: Math.round(data.amountOff * 100), currency: "usd" } : {}),
    duration: data.duration,
    ...(data.duration === "repeating" && data.durationInMonths
      ? { duration_in_months: data.durationInMonths }
      : {}),
    ...(data.maxRedemptions ? { max_redemptions: data.maxRedemptions } : {}),
  });

  // Also create a customer-facing promotion code so it works in checkout
  try {
    await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: codeId || data.name.trim(),
      ...(data.maxRedemptions ? { max_redemptions: data.maxRedemptions } : {}),
    } as any);
  } catch (promoErr) {
    console.warn("Could not create promotion code alias:", promoErr);
  }

  revalidatePath("/admin/payments");
  return { success: true, couponId: coupon.id };
}

/**
 * Delete a coupon from Stripe
 */
export async function deleteCoupon(couponId: string) {
  await requirePermission("manage_payments");
  const stripe = getStripe();
  await stripe.coupons.del(couponId);
  revalidatePath("/admin/payments");
  return { success: true };
}

/**
 * Create and Activate a Member (Student or Parent) directly from the Admin Panel
 */
export async function createAndActivateMember(data: {
  accountType: "student" | "parent";
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  planPriceId: string;
  linkedParentEmail?: string;
  linkedParentName?: string;
  linkedParentPhone?: string;
  linkedStudentEmail?: string;
  linkedStudentName?: string;
  linkedStudentPhone?: string;
}) {
  await requirePermission("manage_payments");
  const adminClient = await createAdminClient();

  const isStudent = data.accountType === "student";

  // 1. Create Auth User
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email.trim(),
    password: data.password,
    email_confirm: true,
    user_metadata: {
      phone: data.phone?.trim() || "",
      account_type: data.accountType,
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
    },
  });

  if (authError || !authData.user) {
    return { error: authError?.message || "Failed to create user account" };
  }

  const userId = authData.user.id;
  const mockCustId = `cus_admin_${userId.slice(0, 8)}`;
  const mockSubId = `sub_admin_${userId.slice(0, 8)}`;

  // 2. Build Profile Data
  const profileData: Record<string, any> = {
    id: userId,
    account_type: data.accountType,
    phone: data.phone?.trim() || "",
    subscription_status: "active",
    stripe_price_id: data.planPriceId,
    stripe_customer_id: mockCustId,
    stripe_subscription_id: mockSubId,
    is_active: true,
    onboarding_complete: false,
    updated_at: new Date().toISOString(),
  };

  if (isStudent) {
    profileData.student_first_name = data.firstName.trim();
    profileData.student_last_name = data.lastName.trim();
    profileData.student_email = data.email.trim();
    profileData.student_phone = data.phone?.trim() || "";

    if (data.linkedParentEmail) {
      profileData.parent_email = data.linkedParentEmail.trim();
      const nameParts = (data.linkedParentName || "").trim().split(" ");
      profileData.parent_first_name = nameParts[0] || "";
      profileData.parent_last_name = nameParts.slice(1).join(" ") || "";
      profileData.parent_phone = data.linkedParentPhone?.trim() || "";
    }
  } else {
    // Parent
    profileData.parent_first_name = data.firstName.trim();
    profileData.parent_last_name = data.lastName.trim();
    profileData.parent_email = data.email.trim();
    profileData.parent_phone = data.phone?.trim() || "";

    if (data.linkedStudentEmail) {
      profileData.student_email = data.linkedStudentEmail.trim();
      const nameParts = (data.linkedStudentName || "").trim().split(" ");
      profileData.student_first_name = nameParts[0] || "";
      profileData.student_last_name = nameParts.slice(1).join(" ") || "";
      profileData.student_phone = data.linkedStudentPhone?.trim() || "";
    }
  }

  // 3. Upsert Profile
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert(profileData);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/users");

  return { success: true, userId };
}

/**
 * Manually activate or change an existing user's plan in DB (bypassing Stripe)
 */
export async function manualActivateSubscriber(userId: string, priceId: string) {
  await requirePermission("manage_payments");
  const adminClient = await createAdminClient();

  const mockSubId = `sub_admin_${userId.slice(0, 8)}`;
  const mockCustId = `cus_admin_${userId.slice(0, 8)}`;

  await adminClient
    .from("profiles")
    .update({
      subscription_status: "active",
      stripe_price_id: priceId,
      stripe_customer_id: mockCustId,
      stripe_subscription_id: mockSubId,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  revalidatePath("/admin/payments");
  revalidatePath("/admin/users");
  return { success: true };
}
