import { getCoachingMessages, getCoachingSessions, getCoachInfo, getCoachingContacts } from "@/app/actions/coaching";
import { CoachingDashboard } from "./CoachingDashboard";
import { getUserPlan, canAccessFeature } from "@/lib/subscription-server";
import { createClient } from "@/lib/supabase/server";
import { LockedFeaturePage } from "@/components/ui/LockedFeaturePage";

export const metadata = {
  title: "College Coach",
  description: "Your personal guide for colleges and scholarships. We're here to help you every step of the way.",
};

export default async function CoachingPage() {
  const plan = await getUserPlan();

  if (!canAccessFeature(plan, "coaching")) {
    return (
      <LockedFeaturePage
        featureName="1-on-1 College Coach & Advisory"
        requiredPlan="elite"
        description="Get direct 1-on-1 access to expert college admissions coaches, live strategy sessions, and unlimited 2-way messaging — exclusively available on the Elite plan."
      />
    );
  }

  const messages = await getCoachingMessages();
  const sessions = await getCoachingSessions();
  const coachInfo = await getCoachInfo();
  const contacts = await getCoachingContacts();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let studentName = "Student";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("student_first_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.student_first_name) {
      studentName = profile.student_first_name;
    }
  }

  return (
    <CoachingDashboard
      initialMessages={messages || []}
      initialSessions={sessions || []}
      initialContacts={contacts || []}
      coachInfo={coachInfo}
      userPlan={plan}
      userName={studentName}
    />
  );
}

