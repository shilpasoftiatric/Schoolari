import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PenTool, Plus, FileText, Clock, Sparkles, Briefcase, Mail } from "lucide-react";
import Link from "next/link";
import { createEssay } from "@/app/actions/essays";
import { getUserPlan, canAccessFeature } from "@/lib/subscription-server";
import { LockedFeaturePage } from "@/components/ui/LockedFeaturePage";
import { getAiDisclaimerStatus } from "@/app/actions/ai-disclaimer";
import { AIDisclaimerModal } from "@/components/ui/AIDisclaimerModal";
import { CreateCoverLetterModal } from "./CreateCoverLetterModal";

export const metadata = {
  title: "Essay & Cover Letter Workspace",
};

export const dynamic = "force-dynamic";

export default async function EssaysDashboardPage() {
  const plan = await getUserPlan();
  if (!canAccessFeature(plan, "essays")) {
    return (
      <LockedFeaturePage
        featureName="AI Essay Workspace"
        requiredPlan="scholar"
        description="Write, brainstorm, and perfect your scholarship essays and job cover letters with our AI-powered workspace — available on the Scholar plan."
      />
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { getStudentDashboardData } = await import("@/services/data-fetcher");
  const { masterId } = await getStudentDashboardData(user.id);
  const adminClient = await createAdminClient();

  const [{ essayDisclaimerAccepted }, { data: allItems, error }] = await Promise.all([
    getAiDisclaimerStatus(),
    adminClient
      .from("essays")
      .select("*")
      .eq("user_id", masterId)
      .order("updated_at", { ascending: false }),
  ]);

  if (error) {
    return <div className="p-8 text-red-500">Failed to load documents: {error.message}</div>;
  }

  const { getUserAiUsage } = await import("@/lib/ai-limits");
  const aiUsage = await getUserAiUsage(masterId);
  const resetDate = aiUsage?.resetDate || "the 1st of next month";

  const isOverBudget = Number(aiUsage?.estimated_cost_usd || 0) >= Number(aiUsage?.monthly_budget_cap_usd || 999999);
  
  // Essay Limits
  const essayLimit = aiUsage?.essay.limit ?? (plan === "starter" ? 3 : plan === "scholar" ? 10 : 999999);
  const essayUsed = aiUsage?.essay.used ?? 0;
  const isLimitedEssayPlan = essayLimit < 900000;
  const essayLimitReached = isOverBudget || (isLimitedEssayPlan && essayUsed >= essayLimit);

  // Cover Letter Limits
  const coverLetterLimit = aiUsage?.cover_letter.limit ?? (plan === "starter" ? 0 : plan === "scholar" ? 5 : 999999);
  const coverLetterUsed = aiUsage?.cover_letter.used ?? 0;
  const isLimitedCoverPlan = coverLetterLimit < 900000;
  const coverLetterLimitReached = isOverBudget || (isLimitedCoverPlan && coverLetterUsed >= coverLetterLimit);

  // Separate Essays vs Cover Letters
  const scholarshipEssays = (allItems || []).filter(
    (e) => !(e.topic?.toLowerCase().includes("cover letter") || e.title?.toLowerCase().includes("cover letter"))
  );

  const coverLetters = (allItems || []).filter(
    (e) => e.topic?.toLowerCase().includes("cover letter") || e.title?.toLowerCase().includes("cover letter")
  );

  return (
    <>
      {!essayDisclaimerAccepted && (
        <AIDisclaimerModal isOpen={true} feature="essay" />
      )}
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-12">
        {/* Main Header */}
        <div className="flex flex-col gap-1.5 sm:gap-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 sm:gap-3">
            Essay & Cover Letter Workspace
            <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-600">
              <PenTool className="w-4 h-4" />
            </div>
          </h1>
          <p className="text-slate-500 text-xs sm:text-lg max-w-3xl">
            Draft, organize, and perfect your scholarship essays, college admissions personal statements, and job cover letters with AI-powered coaching.
          </p>
        </div>

        {/* Section 1: Scholarship & College Essays */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-600" />
                Scholarship & College Essays
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Essays for scholarships, Common App, and college supplemental prompts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {essayLimitReached ? (
                <button
                  disabled
                  title={`You have reached your monthly limit of ${essayLimit} essays. Resets on ${resetDate}.`}
                  className="flex items-center gap-2 bg-slate-200 text-slate-500 font-bold py-2.5 px-5 rounded-xl cursor-not-allowed text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Essay
                </button>
              ) : (
                <Link
                  href="/essays/new"
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm shadow-violet-200 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Essay
                </Link>
              )}
            </div>
          </div>

          {isLimitedEssayPlan && (
            <div className="bg-violet-50/80 border border-violet-100 text-violet-900 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-medium">
              <span>
                Monthly Essay Documents: <strong>{essayUsed} of {essayLimit}</strong> created this month.{" "}
                {essayLimitReached ? `Monthly limit reached. Resets on ${resetDate}.` : `Resets on ${resetDate}.`}
              </span>
              <Link href="/profile" className="font-bold underline ml-3 hover:text-violet-950">Upgrade Plan</Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scholarshipEssays.length === 0 ? (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white shadow-xs">
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No scholarship essays yet</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4">
                  Start drafting your first essay or personal statement with our guided AI interview wizard.
                </p>
                <Link
                  href="/essays/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 font-bold text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Start First Essay
                </Link>
              </div>
            ) : (
              scholarshipEssays.map((essay) => (
                <Link
                  key={essay.id}
                  href={`/essays/${essay.id}`}
                  className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 block relative overflow-hidden"
                >
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 text-slate-400 group-hover:text-violet-600 group-hover:bg-violet-50 transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        essay.status === 'draft' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        essay.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {essay.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-1.5 line-clamp-1 group-hover:text-violet-700 transition-colors">
                      {essay.title || "Untitled Essay"}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-6 flex-1">
                      {essay.topic || "No topic specified."}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mt-auto pt-3 border-t border-slate-100">
                      <Clock className="w-3.5 h-3.5" />
                      Updated {new Date(essay.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Job & Internship Cover Letters */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                Job & Internship Cover Letters
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tailored letters for employer applications, internships, and work-study roles.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <CreateCoverLetterModal
                isLimitReached={coverLetterLimitReached}
                limit={coverLetterLimit}
                resetDate={resetDate}
              />
            </div>
          </div>

          {isLimitedCoverPlan && (
            <div className="bg-indigo-50/80 border border-indigo-100 text-indigo-900 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-medium">
              <span>
                Monthly Cover Letters: <strong>{coverLetterUsed} of {coverLetterLimit}</strong> created this month.{" "}
                {coverLetterLimitReached ? `Monthly limit reached. Resets on ${resetDate}.` : `Resets on ${resetDate}.`}
              </span>
              <Link href="/profile" className="font-bold underline ml-3 hover:text-indigo-950">Upgrade Plan</Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coverLetters.length === 0 ? (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white shadow-xs">
                <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-7 h-7 text-indigo-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No cover letters yet</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4">
                  Create a tailored cover letter draft or generate one directly from any role in Jobs & Internships.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    href="/jobs"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                  >
                    Browse Jobs & Internships
                  </Link>
                </div>
              </div>
            ) : (
              coverLetters.map((letter) => (
                <Link
                  key={letter.id}
                  href={`/essays/${letter.id}`}
                  className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 block relative overflow-hidden"
                >
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        letter.status === 'draft' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        letter.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {letter.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-1.5 line-clamp-1 group-hover:text-indigo-700 transition-colors">
                      {letter.title || "Untitled Cover Letter"}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-6 flex-1">
                      {letter.topic || "Cover Letter"}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mt-auto pt-3 border-t border-slate-100">
                      <Clock className="w-3.5 h-3.5" />
                      Updated {new Date(letter.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

