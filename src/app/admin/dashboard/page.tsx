import { createClient, createAdminClient } from "@/lib/supabase/server";
import { LogOut, Users, GraduationCap, ToggleRight, ToggleLeft, ChevronRight, UserCog, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";

function StatCard({ label, value, icon: Icon, colorClass }: { label: string, value: number, icon: any, colorClass: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-extrabold text-slate-900 leading-tight">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { to: "/admin/users", label: "Members", sub: "Directory & roles", icon: Users },
  { to: "/admin/scholarships", label: "Scholarships", sub: "Records & status", icon: GraduationCap },
  { to: "/admin/settings", label: "Settings", sub: "Site & contact", icon: Settings },
];

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", user?.id || "")
    .single();

  const displayName = profile?.first_name || user?.email?.split("@")[0] || "Admin";

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Fetch Stats
  const adminSupabase = await createAdminClient();
  const [
    { count: totalUsers },
    { count: totalScholarships },
    { count: activeScholarships },
    { count: inactiveScholarships }
  ] = await Promise.all([
    adminSupabase.from("profiles").select("*", { count: "exact", head: true }),
    adminSupabase.from("scholarships").select("*", { count: "exact", head: true }),
    adminSupabase.from("scholarships").select("*", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("scholarships").select("*", { count: "exact", head: true }).eq("is_active", false)
  ]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-slate-500 mt-1">{todayLabel}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total users"
            value={totalUsers || 0}
            icon={Users}
            colorClass="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Total scholarships"
            value={totalScholarships || 0}
            icon={GraduationCap}
            colorClass="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            label="Active scholarships"
            value={activeScholarships || 0}
            icon={ToggleRight}
            colorClass="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Inactive scholarships"
            value={inactiveScholarships || 0}
            icon={ToggleLeft}
            colorClass="bg-slate-100 text-slate-500"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Quick actions</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">Jump to any section instantly</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              href={action.to}
              className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-violet-600 shadow-sm border border-slate-100 group-hover:bg-violet-50 group-hover:border-violet-100 transition-colors">
                  <action.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{action.label}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{action.sub}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-600 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
