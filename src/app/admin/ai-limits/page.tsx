import { createAdminClient } from "@/lib/supabase/server";
import { AILimitsClient } from "./AILimitsClient";
import { requirePermission } from "@/app/actions/admin";

export const metadata = {
  title: "AI Limits",
};

export default async function AILimitsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requirePermission("manage_settings"); // must be admin or super_admin
  
  const searchParams = await props.searchParams;
  const tabParam = searchParams?.tab as string | undefined;
  const activeTab = tabParam === "usage" || tabParam === "limits" ? tabParam : "limits";
  
  const supabase = await createAdminClient();

  // Fetch current limits
  const { data: limits, error: limitsError } = await supabase
    .from("ai_limits")
    .select("*")
    .order("plan", { ascending: false });

  // Fetch usages and join with users to show name and email
  // The ai_usage table doesn't have names, so we can join with auth.users or profiles if possible.
  // Actually, let's fetch profiles and left join ai_usage.
  
  const { data: allProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*");

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
  }

  const { data: usages, error: usagesError } = await supabase
    .from("ai_usage")
    .select("*");

  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

  const studentProfiles = allProfiles?.filter(p => p.account_type === "student" && p.role === "user") || [];

  const students = studentProfiles.map(profile => {
    const usage = usages?.find(u => u.user_id === profile.id);
    const authUser = users?.find(u => u.id === profile.id);

    // If student price ID is starter or null, check if linked parent or shared subscription has upgraded price ID
    let resolvedPriceId = profile.stripe_price_id;
    if (!resolvedPriceId) {
      const linkedParent = allProfiles?.find(p => p.linked_student_id === profile.id || (profile.parent_email && (p.parent_email === profile.parent_email || p.student_email === profile.parent_email)));
      if (linkedParent?.stripe_price_id) {
        resolvedPriceId = linkedParent.stripe_price_id;
      }
    } else if (profile.stripe_subscription_id) {
      const parentWithSameSub = allProfiles?.find(p => p.stripe_subscription_id === profile.stripe_subscription_id && p.stripe_price_id && p.stripe_price_id !== profile.stripe_price_id);
      if (parentWithSameSub?.stripe_price_id) {
        resolvedPriceId = parentWithSameSub.stripe_price_id;
      }
    }

    return {
      ...profile,
      stripe_price_id: resolvedPriceId,
      email: authUser?.email,
      usage: usage || null
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">AI Limits &amp; Usage</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Configure global AI limits and view student usage.</p>
      </div>

      <AILimitsClient 
        initialLimits={limits || []} 
        students={students} 
        defaultTab={activeTab}
      />
    </div>
  );
}
