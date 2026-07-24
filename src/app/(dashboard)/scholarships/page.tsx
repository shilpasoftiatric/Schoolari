import { createClient } from "@/lib/supabase/server";
import { ScholarshipsList } from "./ScholarshipsList";
import { Sparkles, AlertCircle } from "lucide-react";
import { BackToTopButton } from "@/components/ui/BackToTopButton";

export const metadata = {
  title: "Scholarships",
};

export default async function StudentScholarshipsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const category = searchParams?.category;
  const state = searchParams?.state as string | undefined;
  const deadline = searchParams?.deadline as string | undefined;
  const award = searchParams?.award as string | undefined;
  const search = searchParams?.search as string | undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Build query dynamically
  let query = supabase.from("scholarships").select("*").eq("is_active", true);

  if (category) {
    const categories = Array.isArray(category) ? category : [category];
    query = query.in("category", categories);
  }

  if (state && state !== "All") {
    query = query.or(`eligible_states.ilike.%${state}%,state_eligibility_all.eq.true`);
  }

  if (deadline && deadline !== "all") {
    const days = parseInt(deadline, 10);
    if (!isNaN(days)) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const todayStr = new Date().toISOString().split('T')[0];
      const futureStr = futureDate.toISOString().split('T')[0];
      query = query.gte("deadline", todayStr).lte("deadline", futureStr);
    }
  }

  if (award && award !== "all") {
    if (award === "under_500") query = query.lt("award_amount_value", 500);
    else if (award === "500_1000") query = query.gte("award_amount_value", 500).lte("award_amount_value", 1000);
    else if (award === "1000_2500") query = query.gte("award_amount_value", 1000).lte("award_amount_value", 2500);
    else if (award === "2500_5000") query = query.gte("award_amount_value", 2500).lte("award_amount_value", 5000);
    else if (award === "5000_10000") query = query.gte("award_amount_value", 5000).lte("award_amount_value", 10000);
    else if (award === "above_10000") query = query.gte("award_amount_value", 10000);
  }

  if (search) {
    // Quote the search term to safely handle commas in PostgREST syntax
    const q = `"%${search.replace(/"/g, '""')}%"`;
    query = query.or(`name.ilike.${q},description.ilike.${q},eligible_majors.ilike.${q}`);
  }

  query = query.order("featured", { ascending: false }).order("deadline", { ascending: true });

  // Fetch active scholarships + user's existing applications in parallel
  const [scholarshipsRes, applicationsRes] = await Promise.all([
    query,
    user
      ? supabase
        .from("tracker_items")
        .select("reference_id, status")
        .eq("user_id", user.id)
        .eq("reference_type", "scholarship")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (scholarshipsRes.error) {
    return (
      <div className="p-8 text-slate-800 bg-red-50 rounded-xl border border-red-100 flex flex-col gap-2 max-w-2xl mx-auto mt-8">
        <h3 className="font-bold text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> 
          Oops! We couldn't load the scholarships.
        </h3>
        <p className="text-sm">Please try adjusting your search filters or try again later.</p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-red-400 mt-2 font-mono break-words">{scholarshipsRes.error.message}</p>
        )}
      </div>
    );
  }

  // Build a map of scholarshipId → application status for O(1) lookups
  const applicationStatusMap: Record<string, string> = {};
  for (const app of applicationsRes.data ?? []) {
    if (app.reference_id) {
      applicationStatusMap[app.reference_id] = app.status;
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          Discover Scholarships
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600">
            <Sparkles className="w-4 h-4" />
          </div>
        </h1>
        <p className="text-slate-500 text-lg max-w-xl">
          Browse our curated directory of active scholarships. Find the best matches for your background, major, and interests, and apply directly to add them to your tracker.
        </p>
      </div>

      {/* Tracker Link Card */}
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-violet-900 mb-1">Your Tracker</h2>
          <p className="text-violet-700/80 text-sm">
            You have {Object.keys(applicationStatusMap).length} scholarships saved in your tracker. Keep them organized and never miss a deadline!
          </p>
        </div>
        <a 
          href="/tracker?type=scholarship" 
          className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors"
        >
          View Tracker
        </a>
      </div>

      <ScholarshipsList
        initialScholarships={scholarshipsRes.data ?? []}
        applicationStatusMap={applicationStatusMap}
      />
      <BackToTopButton />
    </div>
  );
}
