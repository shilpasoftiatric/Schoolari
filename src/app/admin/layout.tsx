import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, LogOut } from "lucide-react";
import { AdminNav } from "./AdminNav";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Verify Admin Role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

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

        <AdminNav />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-end px-6 md:px-8">
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
