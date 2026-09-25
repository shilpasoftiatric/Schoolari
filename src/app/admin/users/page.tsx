export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createAdminClient } from "@/lib/supabase/server";
import { UsersTable } from "./UsersTable";
import { ShieldCheck } from "lucide-react";

export default async function AdminUsersPage() {
  const adminClient = await createAdminClient();

  // Fetch all profiles
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch auth users (to get their emails), ai_usage and ai_limits
  const [
    { data: { users }, error: authError },
    { data: aiUsages },
    { data: aiLimits }
  ] = await Promise.all([
    adminClient.auth.admin.listUsers(),
    adminClient.from("ai_usage").select("*"),
    adminClient.from("ai_limits").select("*"),
  ]);

  const usageMap = new Map<string, any>();
  (aiUsages || []).forEach((u) => usageMap.set(u.user_id, u));

  if (profilesError || authError) {
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl">
        Failed to load users: {profilesError?.message || authError?.message}
      </div>
    );
  }

  // Auth user lookups
  const authUserMap = new Map<string, any>();
  (users || []).forEach((u) => authUserMap.set(u.id, u));

  // ─── Bidirectional Student & Parent Cross-linking Pass ───────────────────────
  // Build a map so we can look up any profile by its id in O(1).
  const profileMap = new Map<string, any>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p));

  (profiles || []).forEach((profile) => {
    const authUser = authUserMap.get(profile.id);
    const userMeta = authUser?.user_metadata || {};

    if (profile.account_type === "parent") {
      // 1. Find linked student (by linked_student_id, auth metadata, or matching parent_email)
      let student = profile.linked_student_id ? profileMap.get(profile.linked_student_id) : null;
      if (!student && userMeta.linked_student_id) {
        student = profileMap.get(userMeta.linked_student_id);
      }
      if (!student) {
        const parentEmail = (profile.parent_email || authUser?.email || "").toLowerCase().trim();
        if (parentEmail) {
          student = (profiles || []).find(
            (sp) => sp.account_type !== "parent" && (sp.parent_email || "").toLowerCase().trim() === parentEmail
          );
        }
      }

      // 2. Inherit parent information from student's master profile / auth metadata, and inherit student info for display/editing
      if (student) {
        profile.student_first_name = student.student_first_name || student.first_name || "";
        profile.student_last_name = student.student_last_name || "";
        profile.student_email = student.student_email || student.email || "";
        profile.student_phone = student.student_phone || student.phone || "";

        profile.parent_first_name = profile.parent_first_name || student.parent_first_name || userMeta.parent_first_name || userMeta.first_name || "";
        profile.parent_last_name = profile.parent_last_name || student.parent_last_name || userMeta.parent_last_name || userMeta.last_name || "";
        profile.parent_phone = profile.parent_phone || student.parent_phone || userMeta.parent_phone || userMeta.phone || "";
        profile.parent_email = profile.parent_email || student.parent_email || authUser?.email || "";
        profile.first_name = profile.first_name || profile.parent_first_name;
        profile.phone = profile.phone || profile.parent_phone;
        profile.linked_student_id = profile.linked_student_id || student.id;
        (profile as any).linked_student = student;

        // Also ensure student row has matching parent contact info
        student.parent_first_name = student.parent_first_name || profile.parent_first_name || "";
        student.parent_last_name = student.parent_last_name || profile.parent_last_name || "";
        student.parent_phone = student.parent_phone || profile.parent_phone || "";
        student.parent_email = student.parent_email || profile.parent_email || "";
        student.linked_parent_id = student.linked_parent_id || profile.id;
        (student as any).linked_parent = profile;

        // Mirror Stripe subscription status
        const parentHasStripe =
          profile.subscription_status === "active" ||
          profile.subscription_status === "trialing";
        const studentHasStripe =
          student.subscription_status === "active" ||
          student.subscription_status === "trialing";

        if (parentHasStripe && !studentHasStripe) {
          student.stripe_customer_id = profile.stripe_customer_id;
          student.stripe_subscription_id = profile.stripe_subscription_id;
          student.stripe_price_id = profile.stripe_price_id;
          student.subscription_status = profile.subscription_status;
          (student as any)._subscription_owner_id = profile.id;
        } else if (studentHasStripe && !parentHasStripe) {
          profile.stripe_customer_id = student.stripe_customer_id;
          profile.stripe_subscription_id = student.stripe_subscription_id;
          profile.stripe_price_id = student.stripe_price_id;
          profile.subscription_status = student.subscription_status;
          (profile as any)._subscription_owner_id = student.id;
        }
      } else {
        profile.parent_first_name = profile.parent_first_name || profile.first_name || userMeta.parent_first_name || userMeta.first_name || "";
        profile.parent_last_name = profile.parent_last_name || userMeta.parent_last_name || userMeta.last_name || "";
        profile.parent_phone = profile.parent_phone || profile.phone || userMeta.parent_phone || userMeta.phone || "";
        profile.parent_email = profile.parent_email || authUser?.email || "";
        profile.first_name = profile.first_name || profile.parent_first_name;
        profile.phone = profile.phone || profile.parent_phone;
      }
    }
  });

  // Merge profile data with auth email and AI usage
  const mergedUsers = (profiles || []).map((profile) => {
    const authUser = authUserMap.get(profile.id);
    const userMeta = authUser?.user_metadata || {};
    const createdByAdmin = !!(userMeta.created_by_admin || userMeta.created_via_admin);

    return {
      ...profile,
      email: authUser?.email || profile.student_email || profile.parent_email || "Unknown Email",
      created_by_admin: createdByAdmin,
      user_metadata: userMeta,
      usage: usageMap.get(profile.id) || null,
      ai_limits: aiLimits || [],
    };
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-violet-600" />
          Users / Members
        </h1>
        <p className="text-slate-500 mt-1">
          View and manage registered student and parent accounts.
        </p>
      </div>

      <UsersTable initialUsers={mergedUsers} />
    </div>
  );
}
