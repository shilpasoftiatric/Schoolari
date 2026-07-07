import { createClient } from "@/lib/supabase/server";
import { ScholarshipsTable } from "./ScholarshipsTable";
import { GraduationCap } from "lucide-react";

export default async function AdminScholarshipsPage() {
  const supabase = await createClient();

  // We can use the regular client here to fetch because scholarships are readable by anyone
  // or we can use adminClient. Both work, but regular client is fine for reading.
  const { data: scholarships, error } = await supabase
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
