import { 
  getAdminCoachingSessions, 
  getAdminStudentsList,
  getCoachingResources,
  getAdminCoachingFeedback 
} from "@/app/actions/admin-coaching";
import { CoachingAdminTable } from "./CoachingAdminTable";
import { HeartHandshake } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCoachingPage() {
  const [sessionsWithEnrollments, studentsList, coachingResources, feedbackList] = await Promise.all([
    getAdminCoachingSessions(),
    getAdminStudentsList(),
    getCoachingResources(),
    getAdminCoachingFeedback(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-rose-500" />
          Coaching Management
        </h1>
        <p className="text-slate-500 mt-1">
          Create live coaching sessions, view registered students, assign action items, and manage downloadable student coaching resources.
        </p>
      </div>

      <CoachingAdminTable 
        initialSessions={sessionsWithEnrollments} 
        studentsList={studentsList || []} 
        initialResources={coachingResources || []}
        initialFeedback={feedbackList || []}
      />
    </div>
  );
}
