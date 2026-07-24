import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TrackerDashboard } from "./TrackerDashboard";

export const metadata = {
  title: "Tracker",
};

export default async function TrackerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch universal tracker items
  const { data: applications, error } = await supabase
    .from("tracker_items")
    .select(`
      id,
      status,
      notes,
      reference_id,
      reference_type,
      title,
      due_date
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
          Tracker
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl">
          Manage your tasks, scholarships, colleges, and essays. Move them across the board as you progress.
        </p>
      </div>

      <TrackerDashboard initialApplications={applications || []} />
    </div>
  );
}
