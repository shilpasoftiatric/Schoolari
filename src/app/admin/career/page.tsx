import { createAdminClient } from "@/lib/supabase/server";
import { CareerAdmin } from "./career-admin";
import { Briefcase } from "lucide-react";

export default async function AdminCareerPage() {
  const adminClient = await createAdminClient();

  const [jobsRes, articlesRes] = await Promise.all([
    adminClient
      .from("custom_jobs" as any)
      .select("*")
      .order("created_at", { ascending: false }),
    adminClient
      .from("career_articles" as any)
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  // If table doesn't exist yet, just return empty arrays
  const initialJobs = jobsRes.data || [];
  const initialArticles = articlesRes.data || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-violet-600" />
          Career Center CMS
        </h1>
        <p className="text-slate-500 mt-1">
          Manage custom jobs and career articles that will appear in the student jobs portal.
        </p>
      </div>

      <CareerAdmin
        initialJobs={initialJobs}
        initialArticles={initialArticles}
      />
    </div>
  );
}
