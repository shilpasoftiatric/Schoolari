import React from "react";
import { ResumeBuilderClient } from "./ResumeBuilderClient";
import { Metadata } from "next";
import { getUserPlan, canAccessFeature } from "@/lib/subscription-server";
import { LockedFeaturePage } from "@/components/ui/LockedFeaturePage";
import { getAiDisclaimerStatus } from "@/app/actions/ai-disclaimer";
import { AIDisclaimerModal } from "@/components/ui/AIDisclaimerModal";

export const metadata: Metadata = {
  title: "Harvard ATS Resume Builder | Schoolari USA",
  description:
    "Enterprise AI-powered resume builder tailored for high school and college students with STAR bullet optimization and live ATS scoring."
};

export const dynamic = "force-dynamic";

export default async function ResumeBuilderPage() {
  const plan = await getUserPlan();
  if (!canAccessFeature(plan, "resume")) {
    return (
      <LockedFeaturePage
        featureName="Harvard ATS Resume Builder"
        requiredPlan="scholar"
        description="Build a professional resume with AI-powered STAR bullet optimization and live ATS scoring — available on the Scholar plan."
      />
    );
  }

  const { resumeDisclaimerAccepted } = await getAiDisclaimerStatus();

  const { getUserAiUsage } = await import("@/lib/ai-limits");
  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { createClient } = await import("@/lib/supabase/server");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let aiUsage = null;
  if (user) {
    const { masterId } = await getStudentDashboardData(user.id);
    aiUsage = await getUserAiUsage(masterId);
  }

  return (
    <>
      {!resumeDisclaimerAccepted && (
        <AIDisclaimerModal isOpen={true} feature="resume" />
      )}
      <ResumeBuilderClient aiUsage={aiUsage} />
    </>
  );
}

