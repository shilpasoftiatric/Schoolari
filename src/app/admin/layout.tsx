import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck } from "lucide-react";
import { AdminNav } from "./AdminNav";

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
    <div className="flex h-screen bg-slate-50">
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
