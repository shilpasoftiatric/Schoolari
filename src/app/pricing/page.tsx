export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import PricingClient from "./PricingClient";
import { createClient } from "@/lib/supabase/server";

async function getPricingData(): Promise<{ hasHadTrial: boolean; isAlreadyDiscountUser: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { hasHadTrial: false, isAlreadyDiscountUser: false };

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const dbData = await getStudentDashboardData(user.id);
  const userProfile = dbData.userProfile;
  const masterProfile = dbData.profile;

  const hasHadTrial = (
    !!userProfile?.trial_start_date || 
    !!userProfile?.subscription_status || 
    !!userProfile?.stripe_customer_id || 
    !!userProfile?.stripe_subscription_id ||
    !!userProfile?.trial_welcome_email_sent ||
    !!userProfile?.trial_cancelled_email_sent ||
    !!masterProfile?.trial_start_date ||
    !!masterProfile?.subscription_status ||
    !!masterProfile?.stripe_customer_id ||
    !!masterProfile?.stripe_subscription_id ||
    !!masterProfile?.trial_welcome_email_sent ||
    !!masterProfile?.trial_cancelled_email_sent
  );

  const isAlreadyDiscountUser = Boolean(userProfile?.is_discount_user || masterProfile?.is_discount_user);

  return { hasHadTrial, isAlreadyDiscountUser };
}

export default async function PricingPage() {
  const { hasHadTrial, isAlreadyDiscountUser } = await getPricingData();

  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8 text-slate-500">Loading pricing options...</div>}>
      <PricingClient hasHadTrial={hasHadTrial} isAlreadyDiscountUser={isAlreadyDiscountUser} />
    </Suspense>
  );
}
