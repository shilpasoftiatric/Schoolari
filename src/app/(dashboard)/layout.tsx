import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { getStudentDashboardData } from "@/services/data-fetcher";
import { canAccessAdmin } from "@/lib/rbac";
import { getPlanFromPriceId } from "@/lib/subscription";
import { 
  calculateWorkflowStates, 
  calculateOverallProgress, 
  getNextMilestone, 
  getMotivationalMessage 
} from "@/services/task-engine";
import { Suspense } from "react";

function SidebarSkeleton() {
  return (
    <div className="w-64 border-r border-slate-200 bg-slate-150 flex flex-col h-full animate-pulse print:hidden shrink-0">
      {/* Header / Logo Area */}
      <div className="flex items-center h-[76px] pl-5 border-b border-slate-200">
        <div className="w-9 h-9 bg-slate-200 rounded-xl" />
        <div className="ml-3 h-5 w-24 bg-slate-200 rounded" />
      </div>
      
      {/* Navigation list */}
      <div className="flex-1 p-3 space-y-6">
        <div className="h-12 bg-slate-200 rounded-2xl w-full" />
        {[1, 2, 3].map((g) => (
          <div key={g} className="space-y-3">
            <div className="h-3 w-16 bg-slate-200 rounded ml-3" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <div className="w-5 h-5 bg-slate-200 rounded-md" />
                <div className="h-4 bg-slate-200 rounded flex-1" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TopbarSkeleton() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-border shrink-0 animate-pulse print:hidden w-full">
      <div className="w-6 h-6 bg-slate-200 rounded" />
      <div className="flex items-center gap-4">
        <div className="h-8 w-24 bg-slate-200 rounded-full" />
        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 bg-slate-200 rounded-full" />
          <div className="hidden sm:block space-y-1">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-2 w-28 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    </header>
  );
}

async function SidebarLoader({ userId }: { userId: string }) {
  const dbData = await getStudentDashboardData(userId);
  const profile = dbData.profile;
  const userProfile = dbData.userProfile;

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
  const plan = getPlanFromPriceId(userProfile?.stripe_price_id ?? null);

  return <Sidebar siteName={settings.site_name} progressData={progressData} plan={plan} />;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  // Fast single query for initial authentication check (avoids fetching 8+ tables synchronously in layout rendering path)
  const supabase = await createClient();
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (userProfile && canAccessAdmin(userProfile.role)) {
    redirect("/admin/dashboard");
  }

  if (userProfile?.is_active === false) {
    await supabase.auth.signOut();
    redirect("/login?error=account_suspended");
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-slate-50 print:static print:inset-auto print:overflow-visible print:bg-white print:h-auto">
      <div className="hidden lg:flex h-full print:hidden">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarLoader userId={user.id} />
        </Suspense>
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden print:overflow-visible print:h-auto">
        <div className="print:hidden">
          <Suspense fallback={<TopbarSkeleton />}>
            <Topbar />
          </Suspense>
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

