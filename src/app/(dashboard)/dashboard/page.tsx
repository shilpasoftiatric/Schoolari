import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";
import { calculateWorkflowStates, isDashboardStateEqual } from "@/services/task-engine";
import { getStudentDashboardData } from "@/services/data-fetcher";
import { getPlanFromPriceId } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard " };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const dbData = await getStudentDashboardData(user.id);
  const profile = dbData.profile;

  const firstName = profile?.student_first_name || user?.email?.split("@")[0] || "Student";
  let initialData = profile?.ai_dashboard_data || null;

  if (initialData) {
    // Calculate database-driven semantic states using cached data
    const states = calculateWorkflowStates(dbData);

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

  const plan = getPlanFromPriceId(profile?.stripe_price_id ?? null);
  const createdAt = profile?.created_at || null;

  return (
    <DashboardClient
      initialData={initialData}
      firstName={firstName}
      streak={profile?.current_streak || 1}
      userGoals={profile?.schoolari_goals || []}
      globalTasks={dbData.globalTasks || []}
      trackerItems={dbData.trackerItems || []}
      plan={plan}
      createdAt={createdAt}
    />
  );
}
