import { createAdminClient } from "@/lib/supabase/server";
import { CoachingAdminTable } from "./CoachingAdminTable";
import { HeartHandshake } from "lucide-react";

export default async function AdminCoachingPage() {
  const adminClient = await createAdminClient();

  // Fetch all coaching sessions
  const { data: sessions, error: sessionsError } = await adminClient
    .from("coaching_sessions")
    .select("*")
    .order("session_date", { ascending: true });

  // Fetch all enrollments with student profile details
  const { data: enrollments, error: enrollmentsError } = await adminClient
    .from("coaching_enrollments")
    .select(`
      session_id,
      student_id,
      profiles (
        student_first_name,
        student_last_name,
        student_email
      )
    `);

  if (sessionsError) {
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl">
        Failed to load coaching sessions: {sessionsError.message}
      </div>
    );
  }

  // Merge enrollments into sessions
  const sessionsWithEnrollments = sessions?.map(session => {
    const sessionEnrollments = enrollments?.filter(e => e.session_id === session.id) || [];
    return {
      ...session,
      enrollments: sessionEnrollments
    };
  }) || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-rose-500" />
          Coaching Management
        </h1>
        <p className="text-slate-500 mt-1">
          Create live coaching sessions, view registered students, and assign action items.
        </p>
      </div>

      <CoachingAdminTable initialSessions={sessionsWithEnrollments} />
    </div>
  );
}
