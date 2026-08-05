import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { ShieldCheck, LogOut } from "lucide-react";
import { AdminNav } from "./AdminNav";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { canAccessAdmin, isStaffRole, ROLE_LABELS, ROLE_COLORS, type StaffRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  // Verify Staff Role (any of the 5 staff roles)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name")
    .eq("id", user.id)
    .single();

  const role = profile?.role;

  if (!canAccessAdmin(role)) {
    redirect("/dashboard");
  }

  const staffRole = role as StaffRole;
  const roleLabel = ROLE_LABELS[staffRole];
  const roleColor = ROLE_COLORS[staffRole];

  return (
    <div className="fixed inset-0 flex bg-slate-50">
      {/* Admin Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-white shrink-0 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">Admin<span className="text-slate-400 font-normal">Panel</span></span>
        </div>

        <AdminNav role={staffRole} />
        {/* Role Badge */}
        <div className="px-5 py-3 border-t border-slate-100 flex flex-row justify-between items-center">
          <p className="text-xs text-slate-400 font-medium mb-1">{profile?.first_name || user.email}</p>
          <span className={cn("inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold", roleColor)}>
            {roleLabel}
          </span>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-end px-6 md:px-8 bg-white border-b border-slate-200 shrink-0">
          <form action={signOut}>
            <Button type="submit" className="gap-2 font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm h-9">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </form>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
