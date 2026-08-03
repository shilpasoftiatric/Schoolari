import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUserPlan, canAccessFeature } from "@/lib/subscription-server";

export async function GET() {
  try {
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
        { error: "Coaching requires the Elite plan. Please upgrade to access this feature." },
        { status: 403 }
      );
    }

    // Determine the student ID (if parent is logged in, use linked student)
    let targetId = user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type, linked_student_id")
      .eq("id", user.id)
      .single();

    if (profile?.account_type === 'parent' && profile?.linked_student_id) {
      targetId = profile.linked_student_id;
    }

    // Use admin client to bypass RLS so students can see the catalog
    // Fetch sessions that started within the last 24 hours (or in the future)
    const bufferDate = new Date();
    bufferDate.setHours(bufferDate.getHours() - 24);

    const { data: sessions, error: sessionsError } = await adminSupabase
      .from("coaching_sessions")
      .select("*")
      .gte("session_date", bufferDate.toISOString())
      .order("session_date", { ascending: true });

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    // Fetch the user's enrollments using admin client to bypass RLS
    const { data: enrollments, error: enrollmentsError } = await adminSupabase
      .from("coaching_enrollments")
      .select("session_id, attendance_status")
      .eq("user_id", targetId);

    if (enrollmentsError) {
      throw new Error(`Failed to fetch enrollments: ${enrollmentsError.message}`);
    }

    const enrolledSessionIds = enrollments?.map(e => e.session_id) || [];

    // Map sessions to include enrollment status
    // Also, hide the meeting_link if the user is not enrolled
    // Filter out sessions that have already ended based on duration_minutes
    const now = Date.now();
    const mappedSessions = (sessions || [])
      .filter(session => {
        const sessionTime = new Date(session.session_date).getTime();
        const durationMs = (session.duration_minutes || 45) * 60 * 1000;
        return sessionTime + durationMs > now;
      })
      .map(session => {
        const isEnrolled = enrolledSessionIds.includes(session.id);
        return {
          ...session,
          isEnrolled,
          meeting_link: isEnrolled ? session.meeting_link : null
        };
      });

    return NextResponse.json({ sessions: mappedSessions });
  } catch (error: any) {
    console.error("Coaching Sessions API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

