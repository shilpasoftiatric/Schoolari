import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TrackerDashboard } from "./TrackerDashboard";

export const metadata = {
  title: "Application Tracker | Schoolari",
};

export default async function TrackerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch applications along with their scholarship details
  const { data: applications, error } = await supabase
    .from("applications")
    .select(`
      id,
      status,
      notes,
      scholarship_id,
      scholarships (
        id,
        name,
        award_amount,
        deadline,
        category,
        organization_name,
        link
      )
    `)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching applications:", error);
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl">
        Failed to load application tracker.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Application Tracker
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl">
          Manage your scholarship applications. Move them across the board as you progress.
        </p>
      </div>

      <TrackerDashboard initialApplications={applications || []} />
    </div>
  );
}
