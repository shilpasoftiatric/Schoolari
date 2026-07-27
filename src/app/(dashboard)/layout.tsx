import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { getStudentDashboardData } from "@/services/data-fetcher";
import { 
  calculateWorkflowStates, 
  calculateOverallProgress, 
  getNextMilestone, 
  getMotivationalMessage 
} from "@/services/task-engine";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Use the cached data fetcher
  const dbData = await getStudentDashboardData(user.id);
  const profile = dbData.profile;
  const userProfile = dbData.userProfile;

  if (userProfile?.role === "admin") {
    redirect("/admin/dashboard");
  }

  // Calculate Progress
  const states = calculateWorkflowStates(dbData);
  const progressScore = calculateOverallProgress(states, profile);
  const milestone = getNextMilestone(states, progressScore);
  const motivationalMessage = getMotivationalMessage(progressScore);

  const progressData = {
    percentage: progressScore,
    milestone,
    messageTitle: motivationalMessage.title,
    messageSubtitle: motivationalMessage.subtitle
  };

  const settings = await getSiteSettings();

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-slate-50 print:static print:inset-auto print:overflow-visible print:bg-white print:h-auto">
      <div className="hidden lg:flex h-full print:hidden">
        <Sidebar siteName={settings.site_name} progressData={progressData} />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden print:overflow-visible print:h-auto">
        <div className="print:hidden">
          <Topbar />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 print:overflow-visible print:h-auto print:p-0 print:m-0">
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full print:m-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
