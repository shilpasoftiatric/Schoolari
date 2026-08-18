import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  Users,
  GraduationCap,
  ChevronRight,
  Settings,
  HeartHandshake,
  Mail,
  CreditCard,
  MessageSquareText,
  Megaphone,
  Briefcase,
  PlaySquare,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { hasPermission, NAV_PERMISSIONS, type StaffRole } from "@/lib/rbac";

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: any;
  colorClass: string;
}) {
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
  { to: "/admin/users", label: "Users / Members", sub: "Directory & accounts", icon: Users },
  { to: "/admin/scholarships", label: "Scholarships", sub: "Records & status", icon: GraduationCap },
  { to: "/admin/coaching", label: "Coaching", sub: "Sessions & tasks", icon: HeartHandshake },
  { to: "/admin/messages", label: "Messages", sub: "Send & broadcast", icon: Mail },
  { to: "/admin/content", label: "Content Manager", sub: "Banners & announcements", icon: Megaphone },
  { to: "/admin/career", label: "Career Center", sub: "Articles & pathways", icon: Briefcase },
  { to: "/admin/income", label: "Earn While You Learn", sub: "Videos & lessons", icon: PlaySquare },
  { to: "/admin/payments", label: "Payments & Plans", sub: "Stripe subscriptions", icon: CreditCard },
  { to: "/admin/staff", label: "Staff Management", sub: "Roles & permissions", icon: UserCog },
  { to: "/admin/settings", label: "Settings", sub: "Site configuration", icon: Settings },
];

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  // Fire user fetch and count fetches concurrently
  const [
    {
      data: { user },
    },
    { count: totalStudents },
    { count: totalParentsLinked },
    { count: activeSubscriptions },
    { count: coachingSessions },
    { count: messagesSent },
  ] = await Promise.all([
    supabase.auth.getUser(),
    adminSupabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
    adminSupabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .neq("parent_email", "")
      .not("parent_email", "is", null),
    adminSupabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active"),
    adminSupabase.from("coaching_sessions").select("*", { count: "exact", head: true }),
    adminSupabase.from("coaching_messages").select("*", { count: "exact", head: true }),
  ]);

  // Use adminSupabase to reliably read staff profile and role (bypasses RLS)
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("student_first_name, parent_first_name, role")
    .eq("id", user?.id || "")
    .maybeSingle();

  const userRole = (profile?.role as StaffRole) || "super_admin";
  const displayName =
    profile?.student_first_name ||
    profile?.parent_first_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Admin";

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalParents = totalParentsLinked || 0;
  const canViewPayments = hasPermission(userRole, "manage_payments");

  // Filter Quick Actions strictly by RBAC permissions for this role
  const availableActions = QUICK_ACTIONS.filter((action) => {
    const requiredPermission = NAV_PERMISSIONS[action.to];
    if (!requiredPermission) return true;
    return hasPermission(userRole, requiredPermission);
  });

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
            label="Total Students"
            value={totalStudents || 0}
            icon={Users}
            colorClass="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Total Parents"
            value={totalParents}
            icon={Users}
            colorClass="bg-indigo-50 text-indigo-600"
          />
          {canViewPayments ? (
            <StatCard
              label="Active Subs"
              value={activeSubscriptions || 0}
              icon={CreditCard}
              colorClass="bg-emerald-50 text-emerald-600"
            />
          ) : (
            <StatCard
              label="Messages Sent"
              value={messagesSent || 0}
              icon={MessageSquareText}
              colorClass="bg-emerald-50 text-emerald-600"
            />
          )}
          <StatCard
            label="Coaching Sessions"
            value={coachingSessions || 0}
            icon={HeartHandshake}
            colorClass="bg-rose-50 text-rose-600"
          />
        </div>
      </div>

      {/* Quick Actions — Dynamically Gated by Role */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Quick actions</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">Jump to any authorized section instantly</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableActions.map((action) => (
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
