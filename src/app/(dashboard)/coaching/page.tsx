import { getCoachingMessages } from "@/app/actions/coaching";
import { CoachingDashboard } from "./CoachingDashboard";
import { getUserPlan, canAccessFeature } from "@/lib/subscription-server";
import { LockedFeaturePage } from "@/components/ui/LockedFeaturePage";

export const metadata = {
  title: "Coaching Center",
};

export default async function CoachingPage() {
  const plan = await getUserPlan();
  if (!canAccessFeature(plan, "coaching")) {
    return (
      <LockedFeaturePage
        featureName="College Coach Access"
        requiredPlan="elite"
        description="Work 1-on-1 with a dedicated college coach who guides you through applications, essays, and scholarship strategy — available on the Elite plan."
      />
    );
  }

  const messages = await getCoachingMessages();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <CoachingDashboard initialMessages={messages || []} />
    </div>
  );
}

