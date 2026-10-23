"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/app/actions/admin";
import { revalidatePath } from "next/cache";

export interface ReferralAdminItem {
  id: string;
  user_id: string;
  referring_student_name: string;
  referral_first_name: string;
  referral_last_name: string;
  referral_phone: string;
  referral_email: string;
  code_used: string;
  sms_status: string;
  sms_sent_at: string | null;
  created_at: string;
}

export interface PlatformSettingsAdmin {
  code: string;
  enabled: boolean;
  aiMonthlyCap: number;
}

export interface ReferralsAdminStats {
  total: number;
  smsSent: number;
  smsPending: number;
  smsFailed: number;
}

/**
 * Loads all referrals, platform settings, and computed KPI stats for the admin panel.
 */
export async function getReferralsAdminData(): Promise<{
  settings: PlatformSettingsAdmin;
  referrals: ReferralAdminItem[];
  stats: ReferralsAdminStats;
}> {
  await verifyAdmin();
  const adminClient = await createAdminClient();

  // 1. Fetch platform settings
  const settings: PlatformSettingsAdmin = {
    code: "STARTERFREE",
    enabled: true,
    aiMonthlyCap: 10,
  };

  try {
    const { data: settingsRows, error: settingsErr } = await adminClient
      .from("platform_settings")
      .select("key, value");

    if (!settingsErr && settingsRows) {
      const rows = settingsRows as Array<{ key: string; value: string }>;
      const codeRow = rows.find((r) => r.key === "discount_code_value");
      const enabledRow = rows.find((r) => r.key === "discount_code_enabled");
      const capRow = rows.find((r) => r.key === "discount_ai_monthly_cap");

      if (codeRow?.value) settings.code = codeRow.value.trim().toUpperCase();
      if (enabledRow?.value) settings.enabled = enabledRow.value === "true";
      if (capRow?.value) settings.aiMonthlyCap = parseInt(capRow.value, 10) || 10;
    }
  } catch (err) {
    console.warn("[getReferralsAdminData] Error loading platform_settings:", err);
  }

  // 2. Fetch referrals list
  let referrals: ReferralAdminItem[] = [];
  try {
    const { data: refRows, error: refErr } = await adminClient
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false });

    if (!refErr && refRows) {
      const rows = refRows as ReferralAdminItem[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      let profileMap = new Map<
        string,
        {
          id: string;
          student_first_name: string | null;
          student_last_name: string | null;
          first_name: string | null;
          email: string | null;
        }
      >();
      if (userIds.length > 0) {
        const { data: profileRows } = await adminClient
          .from("profiles")
          .select("id, student_first_name, student_last_name, first_name, student_email, parent_email")
          .in("id", userIds);
        if (profileRows) {
          profileMap = new Map(
            profileRows.map((p) => [
              p.id,
              {
                id: p.id,
                student_first_name: p.student_first_name,
                student_last_name: p.student_last_name,
                first_name: p.first_name,
                email: p.student_email || p.parent_email || null,
              },
            ])
          );
        }
      }

      referrals = rows.map((r) => {
        const p = profileMap.get(r.user_id);
        const resolvedProfileName = p
          ? `${p.student_first_name || p.first_name || ""} ${p.student_last_name || ""}`.trim()
          : "";
        const finalStudentName =
          resolvedProfileName ||
          (r.referring_student_name && r.referring_student_name !== "A Schoolari Member"
            ? r.referring_student_name
            : "") ||
          p?.email?.split("@")[0] ||
          "Student";

        return {
          ...r,
          referring_student_name: finalStudentName,
        };
      });
    } else if (refErr) {
      console.warn("[getReferralsAdminData] Error loading referrals:", refErr);
    }
  } catch (err) {
    console.warn("[getReferralsAdminData] Referrals table not accessible:", err);
  }

  // 3. Compute stats
  const total = referrals.length;
  const smsSent = referrals.filter((r) => r.sms_status === "Yes").length;
  const smsPending = referrals.filter((r) => r.sms_status === "Pending").length;
  const smsFailed = referrals.filter((r) => r.sms_status === "Failed").length;

  return {
    settings,
    referrals,
    stats: {
      total,
      smsSent,
      smsPending,
      smsFailed,
    },
  };
}

/**
 * Updates platform discount settings and syncs the monthly AI cap to ai_limits.
 */
export async function updatePlatformSettings(params: {
  code?: string;
  enabled?: boolean;
  aiMonthlyCap?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();

    const updates: { key: string; value: string; updated_at: string }[] = [];

    if (params.code !== undefined) {
      updates.push({
        key: "discount_code_value",
        value: params.code.trim().toUpperCase(),
        updated_at: new Date().toISOString(),
      });
    }

    if (params.enabled !== undefined) {
      updates.push({
        key: "discount_code_enabled",
        value: String(params.enabled),
        updated_at: new Date().toISOString(),
      });
    }

    if (params.aiMonthlyCap !== undefined) {
      const capNum = Math.max(0, params.aiMonthlyCap);
      updates.push({
        key: "discount_ai_monthly_cap",
        value: String(capNum),
        updated_at: new Date().toISOString(),
      });

      // Sync with ai_limits table for discount plan
      try {
        await adminClient.from("ai_limits").upsert(
          {
            plan: "discount",
            ask_ai_limit: capNum,
            essay_limit: capNum,
            resume_limit: capNum,
            cover_letter_limit: capNum,
            monthly_budget_cap_usd: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "plan" }
        );
      } catch (err) {
        console.warn("[updatePlatformSettings] ai_limits upsert warning:", err);
      }
    }

    if (updates.length > 0) {
      const { error } = await adminClient.from("platform_settings").upsert(updates);
      if (error) {
        console.error("[updatePlatformSettings] DB error:", error);
        return { success: false, error: error.message };
      }
    }

    revalidatePath("/admin/referrals");
    return { success: true };
  } catch (err: unknown) {
    console.error("[updatePlatformSettings] Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to update settings";
    return { success: false, error: msg };
  }
}

/**
 * Resends the referral invite SMS to a referred contact.
 */
export async function resendReferralSmsAction(
  referralId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdmin();
    const adminClient = await createAdminClient();
    const { data: ref, error } = await adminClient
      .from("referrals")
      .select("*")
      .eq("id", referralId)
      .maybeSingle();

    if (error || !ref) {
      return { success: false, error: "Referral record not found." };
    }

    const { sendReferralSms } = await import("@/app/actions/sms");
    const senderName = ref.referring_student_name?.split(" ")[0] || "a friend";
    const res = await sendReferralSms(
      ref.id,
      ref.referral_phone,
      ref.referral_first_name,
      senderName
    );

    revalidatePath("/admin/referrals");
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to resend SMS";
    return { success: false, error: msg };
  }
}

