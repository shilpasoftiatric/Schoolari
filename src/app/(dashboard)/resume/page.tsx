import React from "react";
import { getResumesAction } from "@/app/actions/resume";
import { ResumeBuilderClient } from "./ResumeBuilderClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Harvard ATS Resume Builder | Schoolari USA",
  description:
    "Enterprise AI-powered resume builder tailored for US high school and college students with STAR bullet optimization and live ATS scoring."
};

export const dynamic = "force-dynamic";

export default async function ResumeBuilderPage() {
  const initialPayload = await getResumesAction();

  return <ResumeBuilderClient initialPayload={initialPayload} />;
}
