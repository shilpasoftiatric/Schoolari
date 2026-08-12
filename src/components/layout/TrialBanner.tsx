import { getSubscriptionInfo } from "@/app/actions/subscription";
import { AlertCircle } from "lucide-react";
import { ManageTrialButton } from "./ManageTrialButton";

export default async function TrialBanner() {
  const subscription = await getSubscriptionInfo();
  
  console.log("=== DEBUG TRIAL BANNER ===");
  console.log("Subscription Info:", subscription);

  if (!subscription || subscription.status !== "trialing" || !subscription.renewalDate) {
    console.log("Returning null from TrialBanner because:", {
      hasSubscription: !!subscription,
      status: subscription?.status,
      hasRenewalDate: !!subscription?.renewalDate
    });
    return null;
  }

  const today = new Date();
  const renewalDate = new Date(subscription.renewalDate);
  const diffTime = Math.max(0, renewalDate.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-indigo-600 px-4 py-3 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-x-6">
        <div className="flex items-center gap-x-3">
          <AlertCircle className="h-5 w-5 flex-none text-indigo-200" aria-hidden="true" />
          <p className="text-sm/6 font-medium">
            You have {diffDays} {diffDays === 1 ? 'day' : 'days'} left in your free trial. Your {subscription.planInfo?.label || "Pro"} plan begins on {subscription.renewalDate}.
          </p>
        </div>
        <ManageTrialButton currentPlan={subscription.planInfo?.label || "Pro"} />
      </div>
    </div>
  );
}
