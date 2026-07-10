import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ScholarshipsTable } from "./ScholarshipsTable";
import { GraduationCap } from "lucide-react";

export default async function AdminScholarshipsPage() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  // We use adminClient here to fetch because RLS might hide inactive scholarships from regular users.
  const { data: scholarships, error } = await adminSupabase
    .from("scholarships")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl">
        Failed to load scholarships: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-violet-600" />
          Scholarships
        </h1>
        <p className="text-slate-500 mt-1">
          Only name, amount, deadline, apply URL, and description are required. Other fields improve AI matching when filled in.
        </p>
      </div>

      <ScholarshipsTable initialScholarships={scholarships || []} />
    </div>
  );
}
