import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

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

  // Check onboarding status, role, and subscription status
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, role, subscription_status")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    redirect("/admin/dashboard");
  }

  const isActive = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";
  if (!isActive) {
    redirect("/pricing");
  }

  if (profile && !profile.onboarding_complete) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
