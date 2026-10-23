"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatPhoneE164 } from "@/lib/phone";
import { cookies } from "next/headers";

export interface ReferralInput {
  code: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

/**
 * Validates a discount code against platform_settings.
 * Defaults to 'STARTERFREE' if table or keys have not been configured yet.
 */
export async function validateDiscountCode(
  code: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const cleanCode = code ? code.trim().toUpperCase() : "";
    if (!cleanCode) {
      return { valid: false, reason: "Please enter a discount code." };
    }

    const supabaseAdmin = await createAdminClient();

    // Query platform_settings
    const { data: settings, error } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value")
      .in("key", ["discount_code_enabled", "discount_code_value"]);

    let isEnabled = true;
    let expectedCode = "STARTERFREE";

    if (!error && settings && settings.length > 0) {
      const rows = settings as Array<{ key: string; value: string }>;
      const enabledRow = rows.find((s) => s.key === "discount_code_enabled");
      const codeRow = rows.find((s) => s.key === "discount_code_value");

      if (enabledRow) {
        isEnabled = enabledRow.value === "true";
      }
      if (codeRow && codeRow.value) {
        expectedCode = codeRow.value.trim().toUpperCase();
      }
    }

    if (!isEnabled) {
      return { valid: false, reason: "Discount code promotions are currently disabled." };
    }

    if (cleanCode !== expectedCode) {
      return { valid: false, reason: "Invalid or expired discount code." };
    }

    return { valid: true };
  } catch (err: unknown) {
    console.error("[validateDiscountCode] Error:", err);
    // Graceful fallback for STARTERFREE
    if (code.trim().toUpperCase() === "STARTERFREE") {
      return { valid: true };
    }
    return { valid: false, reason: "Failed to validate discount code." };
  }
}

/*
 * Claims the free Starter Plan via referral submission.
 * Validates code, saves referral contact, activates Starter access on profile,
 * and asynchronously fires referral SMS (Task 2).
 */
export async function claimDiscountPlan(referral: ReferralInput) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Please sign in or create an account before claiming your plan.",
      };
    }

    // Server-side validation
    const validation = await validateDiscountCode(referral.code);
    if (!validation.valid) {
      return { success: false, error: validation.reason || "Invalid discount code." };
    }

    if (
      !referral.firstName?.trim() ||
      !referral.lastName?.trim() ||
      !referral.phone?.trim() ||
      !referral.email?.trim()
    ) {
      return {
        success: false,
        error: "All referral fields (First Name, Last Name, Phone, and Email) are required.",
      };
    }

    const e164Phone = formatPhoneE164(referral.phone);
    if (!e164Phone) {
      return {
        success: false,
        error: "Please enter a valid phone number.",
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(referral.email.trim())) {
      return {
        success: false,
        error: "Please enter a valid email address for the referral.",
      };
    }

    const supabaseAdmin = await createAdminClient();

    // Fetch referring user's profile to resolve their name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, student_first_name, student_last_name, parent_first_name, parent_last_name")
      .eq("id", user.id)
      .maybeSingle();

    const studentFirstName =
      profile?.student_first_name?.trim() ||
      profile?.first_name?.trim() ||
      profile?.parent_first_name?.trim() ||
      user.user_metadata?.first_name ||
      user.user_metadata?.student_first_name ||
      user.email?.split("@")[0] ||
      "Student";

    const studentLastName =
      profile?.student_last_name?.trim() ||
      profile?.parent_last_name?.trim() ||
      user.user_metadata?.last_name ||
      "";

    const referringStudentName = `${studentFirstName} ${studentLastName}`.trim();

    // Insert referral record
    const { data: referralRow, error: referralErr } = await supabaseAdmin
      .from("referrals")
      .insert({
        user_id: user.id,
        referring_student_name: referringStudentName,
        referral_first_name: referral.firstName.trim(),
        referral_last_name: referral.lastName.trim(),
        referral_phone: e164Phone,
        referral_email: referral.email.trim().toLowerCase(),
        code_used: referral.code.trim().toUpperCase(),
        sms_status: "Pending",
        sms_sent_at: null,
      })
      .select("id")
      .single();

    if (referralErr) {
      console.error("[claimDiscountPlan] Error inserting referral:", referralErr);
      // Even if referral table write fails, proceed to update profile so sign-up flow is not blocked
    }

    const referralId = referralRow?.id || "";

    // Activate subscription on user profile
    const starterPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || null;
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({
        is_discount_user: true,
        discount_code_used: referral.code.trim().toUpperCase(),
        subscription_status: "active",
        stripe_price_id: starterPriceId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileErr) {
      console.error("[claimDiscountPlan] Error updating profile:", profileErr);
      return { success: false, error: "Failed to activate Starter plan. Please try again." };
    }

    // Invalidate proxy session cache immediately so user transitions without delay
    try {
      const cookieStore = await cookies();
      cookieStore.delete("sch_session_ctx");
    } catch {
      // safe fallback if headers are locked
    }

    // Referral record is created with sms_status: "Pending".
    // The SMS will be automatically dispatched after Step 1 of onboarding completes,
    // ensuring the student's real full name is stored in profiles and included in the SMS.

    return { success: true, referralId };
  } catch (error: unknown) {
    console.error("[claimDiscountPlan] Unexpected exception:", error);
    const msg = error instanceof Error ? error.message : "Failed to process referral.";
    return { success: false, error: msg };
  }
}
