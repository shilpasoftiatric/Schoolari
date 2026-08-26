import { JobsDashboard } from "./JobsDashboard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getUserPlan, canAccessFeature } from "@/lib/subscription-server";
import { LockedFeaturePage } from "@/components/ui/LockedFeaturePage";
import { getCareerArticles } from "@/app/actions/career";
import { getPersonalizedJobsAction } from "@/app/actions/career-ai";

export const metadata = {
  title: "Jobs & Internships",
};

export default async function JobsPage() {
  const plan = await getUserPlan();
  if (!canAccessFeature(plan, "jobs")) {
    return (
      <LockedFeaturePage
        featureName="Jobs & Internships"
        requiredPlan="scholar"
        description="Discover AI-personalized job and internship opportunities matched to your major and career interests — available on the Scholar plan."
      />
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch tracked items to see which jobs have already been saved/applied to
  const { data: trackedJobs } = await supabase
    .from("tracker_items")
    .select("reference_id, status")
    .eq("user_id", user.id)
    .eq("reference_type", "job");

  const trackedJobMap = (trackedJobs || []).reduce((acc: any, item: any) => {
    if (item.reference_id) {
      acc[item.reference_id] = item.status;
    }
    return acc;
  }, {});

  // Fetch initial personalized jobs, career resources, resumes, and AI limits server-side
  const [initialArticles, initialJobs, initialResumes, initialAiLimits] = await Promise.all([
    getCareerArticles().catch(() => []),
    getPersonalizedJobsAction().catch(() => []),
    import("@/app/actions/resume").then(m => m.getResumesAction()).catch(() => ({ resumes: [], active_resume_id: "" })),
    import("@/app/actions/career-ai").then(m => m.getCareerAiLimitsAction()).catch(() => null),
  ]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          Jobs & Internships
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-600">
            <Sparkles className="w-4 h-4" />
          </div>
        </h1>
        <p className="text-slate-500 text-lg max-w-xl">
          Personalized opportunities curated by AI based on your major, interests, and profile. Apply directly to add them to your tracker.
        </p>
      </div>

      <JobsDashboard 
        trackedJobMap={trackedJobMap} 
        initialJobs={initialJobs} 
        initialArticles={initialArticles} 
        initialResumes={initialResumes}
        initialAiLimits={initialAiLimits}
      />
    </div>
  );
}


