import React from "react";
import { getResumesAction } from "@/app/actions/resume";
import { ResumeBuilderClient } from "./ResumeBuilderClient";
import { Metadata } from "next";
import { getUserPlan, canAccessFeature } from "@/lib/subscription-server";
import { LockedFeaturePage } from "@/components/ui/LockedFeaturePage";

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

  const initialPayload = await getResumesAction();
  return <ResumeBuilderClient initialPayload={initialPayload} />;
}

