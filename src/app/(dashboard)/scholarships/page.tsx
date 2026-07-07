import { createClient } from "@/lib/supabase/server";
import { ScholarshipsList } from "./ScholarshipsList";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Schoolari — Scholarships",
};

export default async function StudentScholarshipsPage() {
  const supabase = await createClient();

  // Fetch only active scholarships and sort by featured first, then deadline
  const { data: scholarships, error } = await supabase
    .from("scholarships")
    .select("*")
    .eq("is_active", true)
    .order("featured", { ascending: false })
    .order("deadline", { ascending: true });

  if (error) {
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl">
        Failed to load scholarships: {error.message}
      </div>
    );
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
        <p className="text-slate-500 text-lg max-w-2xl">
          Browse our curated directory of active scholarships. Find the best matches for your background, major, and interests, and apply directly to add them to your tracker.
        </p>
      </div>

      <ScholarshipsList initialScholarships={scholarships || []} />
    </div>
  );
}
