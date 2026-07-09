import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";
import { calculateWorkflowStates, isDashboardStateEqual } from "@/services/task-engine";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard | Schoolari" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const firstName = profile?.first_name || user?.email?.split("@")[0] || "Student";
  let initialData = profile?.ai_dashboard_data || null;

  if (initialData) {
    // Check if progress stats match
    const [docsRes, essaysRes, collegesRes, appsRes, resumeRes] = await Promise.all([
      supabase.from("documents").select("type").eq("user_id", user.id),
      supabase.from("essays").select("status").eq("user_id", user.id),
      supabase.from("saved_colleges").select("status, college_name, deadline").eq("user_id", user.id),
      supabase.from("applications").select("status, scholarships(deadline, name)").eq("user_id", user.id),
      supabase.from("resumes").select("*").eq("user_id", user.id).maybeSingle()
    ]);

    const docs = docsRes.data || [];
    const essays = essaysRes.data || [];
    const savedColleges = collegesRes.data || [];
    const apps = appsRes.data || [];
    const resume = resumeRes.data || null;

    // Calculate database-driven semantic states
    const states = calculateWorkflowStates({
      documents: docs,
      essays,
      savedColleges,
      applications: apps,
      resume,
      profile
    });

    const currentState = {
      ...states,
      firstName
    };

    const cachedState = initialData._state;
    const isStateEqual = isDashboardStateEqual(currentState, cachedState);

    if (!isStateEqual) {
      initialData = null; // Invalidate cache so client fetches dynamically
    }
  }

  return (
    <DashboardClient initialData={initialData} firstName={firstName} />
  );
}
