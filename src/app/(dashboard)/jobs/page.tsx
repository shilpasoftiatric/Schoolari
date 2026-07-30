import { getPersonalizedJobsAction } from "@/app/actions/career-ai";
import { getCareerArticles } from "@/app/actions/career";
import { JobsDashboard } from "./JobsDashboard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Jobs & Internships",
};

export default async function JobsPage() {
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

  // For initial load, we'll fetch personalized jobs on the server
  let initialJobs = [];
  let articles = [];
  try {
    initialJobs = await getPersonalizedJobsAction();
    articles = await getCareerArticles();
  } catch (error) {
    console.error("Failed to load personalized jobs on server:", error);
  }

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

      {/* Tracker Link Card */}
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-violet-900 mb-1">Your Tracker</h2>
          <p className="text-violet-700/80 text-sm">
            You have {Object.keys(trackedJobMap).length} jobs saved in your tracker. Keep them organized and track your interview status!
          </p>
        </div>
        <a 
          href="/tracker?type=job" 
          className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors shadow-sm"
        >
          View Tracker
        </a>
      </div>

      <JobsDashboard initialJobs={initialJobs} trackedJobMap={trackedJobMap} initialArticles={articles} />
    </div>
  );
}
