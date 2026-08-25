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

  // ─── Cross-linking Pass ──────────────────────────────────────────────────────
  // Build a map so we can look up any profile by its id in O(1).
  const profileMap = new Map<string, any>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p));

  // For each parent profile, find the student they link to (via linked_student_id)
  // and populate the student's parent_* fields AND the effective Stripe data.
  // This ensures the admin panel always shows correct subscription info on the
  // student row regardless of who actually paid.
  const parentIdSet = new Set<string>(); // tracks parents that ARE already sub-rows

  (profiles || []).forEach((profile) => {
    if (profile.account_type === "parent" && profile.linked_student_id) {
      const student = profileMap.get(profile.linked_student_id);
      if (student) {
        // Mark this parent as "linked" — do NOT render it as a standalone top-level row
        parentIdSet.add(profile.id);

        // Populate parent contact fields onto the student row so ParentSection renders
        student.parent_first_name = student.parent_first_name || profile.parent_first_name || profile.first_name || "";
        student.parent_last_name  = student.parent_last_name  || profile.parent_last_name  || "";
        student.parent_email      = student.parent_email      || profile.parent_email       || "";
        student.parent_phone      = student.parent_phone      || profile.parent_phone       || profile.phone || "";

        // Determine effective Stripe data: student pays → student row has it already.
        // If parent paid, mirror Stripe data onto the student object for the admin panel.
        const parentHasStripe =
          profile.subscription_status === "active" ||
          profile.subscription_status === "trialing";
        const studentHasStripe =
          student.subscription_status === "active" ||
          student.subscription_status === "trialing";

        if (parentHasStripe && !studentHasStripe) {
          student.stripe_customer_id     = profile.stripe_customer_id;
          student.stripe_subscription_id = profile.stripe_subscription_id;
          student.stripe_price_id        = profile.stripe_price_id;
          student.subscription_status    = profile.subscription_status;
          // Track who the subscription owner really is, so cancel works correctly
          student._subscription_owner_id = profile.id;
        }
      }
    }
  });

  // Merge profile data with auth email, AI usage, and mark linked parents
  const mergedUsers = (profiles || []).map((profile) => {
    const authUser = users.find((u) => u.id === profile.id);
    return {
      ...profile,
      email: authUser?.email || "Unknown Email",
      usage: usageMap.get(profile.id) || null,
      ai_limits: aiLimits || [],
      // Flag tells the table not to render this profile as a standalone top-level row
      _isLinkedParent: parentIdSet.has(profile.id),
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
          View all registered members. Promote accounts to administrator when needed.
        </p>
      </div>

      <UsersTable initialUsers={mergedUsers} />
    </div>
  );
}
