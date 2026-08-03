import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUserPlan, canAccessFeature } from "@/lib/subscription-server";

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = await createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Plan check: coaching requires Elite
    const plan = await getUserPlan();
    if (!canAccessFeature(plan, "coaching")) {
      return NextResponse.json(
        { error: "Coaching access requires the Elite plan. Please upgrade." },
        { status: 403 }
      );
    }

    // Fetch session details using admin client to bypass RLS
    const { data: session, error: sessionError } = await adminSupabase
      .from("coaching_sessions")
      .select("session_type")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Determine the student ID
    let targetId = user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type, linked_student_id, stripe_price_id")
      .eq("id", user.id)
      .single();

    if (profile?.account_type === 'parent' && profile?.linked_student_id) {
      targetId = profile.linked_student_id;
    }

    // The plan check already enforces Elite above; no extra session_type check needed here
    if (profile?.account_type === 'parent' && profile?.linked_student_id) {
      targetId = profile.linked_student_id;
    }

    // Insert enrollment using admin client to bypass RLS (authorization is already handled above)
    const { error: enrollError } = await adminSupabase
      .from("coaching_enrollments")
      .insert({
        session_id: sessionId,
        user_id: targetId,
        attendance_status: 'registered'
      });

    if (enrollError) {
      // If it's a unique constraint violation, they are already enrolled
      if (enrollError.code === '23505') {
        return NextResponse.json({ success: true, message: "Already enrolled" });
      }
      throw new Error(`Failed to enroll: ${enrollError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Coaching Enroll API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

