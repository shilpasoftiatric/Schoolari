import { redirect } from "next/navigation";
import { createAdminClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { canAccessAdmin, type StaffRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const adminSupabase = await createAdminClient();
  // Verify Staff Role with adminSupabase (bypasses RLS)
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, student_first_name, parent_first_name")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;

  if (!canAccessAdmin(role)) {
    redirect("/dashboard");
  }

  const staffRole = role as StaffRole;
  const userName = profile?.student_first_name || profile?.parent_first_name || user.email?.split("@")[0];

  return (
    <div className="fixed inset-0 flex bg-slate-50 overflow-hidden">
      {/* Responsive & Collapsible Admin Sidebar */}
      <AdminSidebar
        role={staffRole}
        userName={userName}
        userEmail={user.email}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
