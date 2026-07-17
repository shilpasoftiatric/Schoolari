import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_GOALS = [
  "Finding scholarships",
  "Writing essays",
  "Choosing colleges",
  "Building a resume",
  "Finding internships or jobs",
  "Earning money now",
];

/**
 * POST /api/profile/add-goal
 * Immediately adds a single goal to the student's profile without a page reload.
 * Used by the Dashboard goals widget "+ Add" button.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { goal } = body;

    if (!goal || !VALID_GOALS.includes(goal)) {
      return NextResponse.json({ error: "Invalid goal" }, { status: 400 });
    }

    // Fetch current goals
    const { data: profile } = await supabase
      .from("profiles")
      .select("schoolari_goals, dashboard_priorities")
      .eq("id", user.id)
      .single();

    const currentGoals: string[] = profile?.schoolari_goals || [];
    if (currentGoals.includes(goal)) {
      return NextResponse.json({ success: true, goals: currentGoals }); // already active
    }

    const updatedGoals = [...currentGoals, goal];

    const { error } = await supabase
      .from("profiles")
      .update({
        schoolari_goals: updatedGoals,
        dashboard_priorities: updatedGoals, // legacy compat
      })
      .eq("id", user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, goals: updatedGoals });
  } catch (err: any) {
    console.error("[api/profile/add-goal]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
