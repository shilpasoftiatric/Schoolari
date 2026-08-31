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
    <div className="bg-indigo-600 px-3.5 py-2.5 sm:px-4 sm:py-3 text-white">
      <div className="mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-x-6 max-w-7xl">
        <div className="flex items-center gap-x-2.5 min-w-0">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-none text-indigo-200" aria-hidden="true" />
          <p className="text-xs sm:text-sm font-medium leading-snug">
            You have <strong className="font-bold">{diffDays} {diffDays === 1 ? 'day' : 'days'}</strong> left in your free trial. Your {subscription.planInfo?.label || "Pro"} plan begins on {subscription.renewalDate}.
          </p>
        </div>
        <div className="self-end sm:self-center shrink-0">
          <ManageTrialButton currentPlan={subscription.planInfo?.label || "Pro"} />
        </div>
      </div>
    </div>
  );
}
