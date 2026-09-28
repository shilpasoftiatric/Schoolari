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
  try {
    await requirePermission("manage_payments");
    const adminClient = await createAdminClient();

    const isManualOrMock =
      !stripeSubscriptionId ||
      stripeSubscriptionId.startsWith("sub_admin_") ||
      stripeSubscriptionId.startsWith("mock_");

    let stripeStatus: string | undefined = undefined;

    if (!isManualOrMock) {
      try {
        const stripe = getStripe();
        const deleted = await stripe.subscriptions.cancel(stripeSubscriptionId);
        stripeStatus = deleted.status;
      } catch (stripeErr: any) {
        // If Stripe returns 'resource_missing' (code: 'resource_missing' or status: 404),
        // the subscription is not in Stripe (e.g. manual test record or already removed).
        const isResourceMissing =
          stripeErr?.code === "resource_missing" ||
          stripeErr?.statusCode === 404 ||
          stripeErr?.raw?.code === "resource_missing" ||
          stripeErr?.message?.includes("No such subscription");

        if (!isResourceMissing) {
          console.error("Stripe subscription cancel error:", stripeErr);
          return {
            success: false,
            error: stripeErr?.message || "Failed to cancel subscription in Stripe.",
          };
        }
      }
    }

    const updateFields = {
      subscription_status: "canceled",
      trial_cancelled_email_sent: true,
      updated_at: new Date().toISOString(),
    };

    if (userId) {
      await adminClient
        .from("profiles")
        .update(updateFields)
        .eq("id", userId);
    }

    if (stripeSubscriptionId) {
      await adminClient
        .from("profiles")
        .update(updateFields)
        .eq("stripe_subscription_id", stripeSubscriptionId);
    }

    if (userId) {
      await mirrorStripeSubscription(userId, updateFields);
    }

    revalidatePath("/admin/payments");
    revalidatePath("/admin/users");

    return {
      success: true,
      status: stripeStatus || "canceled",
      message: isManualOrMock
        ? "Subscription canceled successfully in database (manual account)."
        : "Subscription canceled successfully.",
    };
  } catch (err: any) {
    console.error("Error in cancelSubscription:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while canceling the subscription.",
    };
  }
}

/**
 * Issue a full or partial refund on a Stripe PaymentIntent
 */
export async function issueRefund(paymentIntentId: string, amountCents?: number) {
  try {
    await requirePermission("manage_payments");
    const stripe = getStripe();

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amountCents ? { amount: amountCents } : {}),
    });

    return { success: true, refundId: refund.id, status: refund.status };
  } catch (err: any) {
    console.error("Error in issueRefund:", err);
    return {
      success: false,
      error: err?.message || "Failed to process refund in Stripe.",
    };
  }
}

/**
 * Change a user's subscription plan (upgrade/downgrade)
 */
export async function changeSubscriptionPlan(
  stripeSubscriptionId: string,
  newPriceId: string,
  userId: string
) {
  try {
    await requirePermission("manage_payments");
    const adminClient = await createAdminClient();

    const isManualOrMock =
      !stripeSubscriptionId ||
      stripeSubscriptionId.startsWith("sub_admin_") ||
      stripeSubscriptionId.startsWith("mock_");

    if (isManualOrMock) {
      await adminClient
        .from("profiles")
        .update({
          stripe_price_id: newPriceId,
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      revalidatePath("/admin/payments");
      revalidatePath("/admin/users");
      return { success: true, message: "Subscription plan updated in database." };
    }

    const stripe = getStripe();
    let updatedStatus = "active";
    try {
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const subscriptionItemId = subscription.items.data[0]?.id;

      if (!subscriptionItemId) {
        throw new Error("No subscription line items found to update.");
      }

      const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
        items: [{ id: subscriptionItemId, price: newPriceId }],
        proration_behavior: "create_prorations",
      });
      updatedStatus = updated.status;
    } catch (stripeErr: any) {
      const isMissing =
        stripeErr?.code === "resource_missing" ||
        stripeErr?.statusCode === 404 ||
        stripeErr?.raw?.code === "resource_missing";

      if (isMissing) {
        // Fallback to update database plan directly
        await adminClient
          .from("profiles")
          .update({
            stripe_price_id: newPriceId,
            subscription_status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        revalidatePath("/admin/payments");
        revalidatePath("/admin/users");
        return {
          success: true,
          message: "Subscription was not active in Stripe; updated in database directly.",
        };
      }

      return {
        success: false,
        error: stripeErr?.message || "Failed to update subscription in Stripe.",
      };
    }

    await adminClient
      .from("profiles")
      .update({
        stripe_price_id: newPriceId,
        subscription_status: updatedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    revalidatePath("/admin/payments");
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    console.error("Error in changeSubscriptionPlan:", err);
    return {
      success: false,
      error: err?.message || "Failed to change subscription plan.",
    };
  }
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
  try {
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
  } catch (err: any) {
    console.error("Error in createCoupon:", err);
    return {
      success: false,
      error: err?.message || "Failed to create coupon in Stripe.",
    };
  }
}

/**
 * Delete a coupon from Stripe
 */
export async function deleteCoupon(couponId: string) {
  try {
    await requirePermission("manage_payments");
    const stripe = getStripe();
    await stripe.coupons.del(couponId);
    revalidatePath("/admin/payments");
    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteCoupon:", err);
    return {
      success: false,
      error: err?.message || "Failed to delete coupon from Stripe.",
    };
  }
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
