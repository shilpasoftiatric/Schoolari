export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  Cpu,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { hasPermission, NAV_PERMISSIONS, type StaffRole } from "@/lib/rbac";
import { DashboardHero } from "./components/DashboardHero";

// ─── StatCard ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  iconBg: string;
  borderColor: string;
}

function StatCard({ label, value, icon: Icon, gradient, iconColor, iconBg, borderColor }: StatCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-5 sm:p-6 border shadow-sm
        bg-white hover:shadow-md hover:-translate-y-0.5
        transition-all duration-200 ease-out group cursor-default
        ${borderColor}
      `}
    >
      {/* Subtle gradient accent in corner */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-30 pointer-events-none ${gradient}`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            {label}
          </p>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-none tracking-tight">
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>

      {/* Subtle animated underline on hover */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ${gradient}`} />
    </div>
  );
}

// ─── Quick Actions ──────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { to: "/admin/users", label: "Users / Members", sub: "Directory & accounts", icon: Users },
  { to: "/admin/scholarships", label: "Scholarships", sub: "Records & status", icon: GraduationCap },
  { to: "/admin/coaching", label: "Coaching", sub: "Sessions & tasks", icon: HeartHandshake },
  { to: "/admin/messages", label: "Messages", sub: "Send & broadcast", icon: Mail },
  { to: "/admin/content", label: "Content Manager", sub: "Banners & announcements", icon: Megaphone },
  { to: "/admin/career", label: "Career Center", sub: "Articles & pathways", icon: Briefcase },
  { to: "/admin/income", label: "Earn While You Learn", sub: "Videos & lessons", icon: PlaySquare },
  { to: "/admin/payments", label: "Payments & Plans", sub: "Stripe subscriptions", icon: CreditCard },
  { to: "/admin/ai-limits", label: "AI Limits", sub: "Usage & monthly caps", icon: Cpu },
  { to: "/admin/staff", label: "Staff Management", sub: "Roles & permissions", icon: UserCog },
  { to: "/admin/settings", label: "Settings", sub: "Site configuration", icon: Settings },
];

// Icon color palette cycling for Quick Actions
const ACTION_COLORS = [
  "bg-blue-50 text-blue-600 border-blue-100",
  "bg-violet-50 text-violet-600 border-violet-100",
  "bg-rose-50 text-rose-500 border-rose-100",
  "bg-sky-50 text-sky-600 border-sky-100",
  "bg-amber-50 text-amber-600 border-amber-100",
  "bg-emerald-50 text-emerald-600 border-emerald-100",
  "bg-pink-50 text-pink-600 border-pink-100",
  "bg-cyan-50 text-cyan-600 border-cyan-100",
  "bg-indigo-50 text-indigo-600 border-indigo-100",
  "bg-teal-50 text-teal-600 border-teal-100",
  "bg-orange-50 text-orange-600 border-orange-100",
];

// ─── Greeting helper ────────────────────────────────────────────────────────

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  // ── Data fetches ──────────────────────────────────────────────────────────
  const [
    {
      data: { user },
    },
    { data: allProfiles },
    { count: coachingSessions },
    { count: messagesSent },
  ] = await Promise.all([
    supabase.auth.getUser(),
    adminSupabase
      .from("profiles")
      .select("id, account_type, role, parent_email, linked_student_id, stripe_subscription_id, subscription_status"),
    adminSupabase.from("coaching_sessions").select("*", { count: "exact", head: true }),
    adminSupabase.from("coaching_messages").select("*", { count: "exact", head: true }),
  ]);

  const staffRoleKeys = new Set([
    "super_admin",
    "admin",
    "college_coach",
    "essay_coach",
    "essay_editor",
    "content_manager",
    "customer_support",
    "counselor",
    "financial_aid_specialist",
  ]);

  const profilesList = allProfiles || [];

  // Exact student count: not a staff account/role and not a parent account
  const totalStudents = profilesList.filter((p) => {
    const isStaff = p.account_type === "staff" || staffRoleKeys.has(p.role);
    const isParent = p.account_type === "parent";
    return !isStaff && !isParent;
  }).length;

  // Exact parent count: account_type is 'parent'
  const totalParents = profilesList.filter((p) => {
    const isStaff = p.account_type === "staff" || staffRoleKeys.has(p.role);
    return p.account_type === "parent" && !isStaff;
  }).length;

  // ── Active Subscription count — matches Payments & Memberships logic exactly ──
  const profileMap = new Map<string, any>();
  profilesList.forEach((p) => profileMap.set(p.id, p));

  // 1. Cross-linking pass: if parent holds Stripe data, mirror it onto the student profile
  profilesList.forEach((profile) => {
    if (profile.account_type === "parent") {
      let student = profile.linked_student_id ? profileMap.get(profile.linked_student_id) : null;
      if (!student && profile.parent_email) {
        const pEmail = profile.parent_email.toLowerCase().trim();
        student = profilesList.find(
          (sp) => sp.account_type !== "parent" && (sp.parent_email || "").toLowerCase().trim() === pEmail
        );
      }

      if (student) {
        const parentHasStripe = Boolean(profile.stripe_subscription_id);
        const studentHasStripe = Boolean(student.stripe_subscription_id);

        if (parentHasStripe && !studentHasStripe) {
          student.stripe_subscription_id = profile.stripe_subscription_id;
          student.subscription_status = profile.subscription_status;
        }
      }
    }
  });

  // 2. Count active subscriber members (excluding staff & deduplicating linked family/sub IDs)
  const seenSubIds = new Set<string>();
  let activeSubscriptions = 0;

  profilesList.forEach((p) => {
    const isStaff = p.account_type === "staff" || staffRoleKeys.has(p.role);
    if (isStaff) return;

    // If this profile is a parent linked to a student, do NOT count as a separate subscription row
    if (p.account_type === "parent") {
      const isLinked = Boolean(
        p.linked_student_id ||
        (p.parent_email &&
          profilesList.some(
            (sp) => sp.account_type !== "parent" && (sp.parent_email || "").toLowerCase().trim() === (p.parent_email || "").toLowerCase().trim()
          ))
      );
      if (isLinked) return;
    }

    const isActive = p.subscription_status === "active" || p.subscription_status === "trialing";
    if (!isActive) return;

    if (p.stripe_subscription_id) {
      if (seenSubIds.has(p.stripe_subscription_id)) return;
      seenSubIds.add(p.stripe_subscription_id);
    }

    activeSubscriptions++;
  });

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

  const now = new Date();
  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const greeting = getGreeting(now.getHours());

  const canViewPayments = hasPermission(userRole, "manage_payments");

  // Filter Quick Actions strictly by RBAC permissions for this role
  const availableActions = QUICK_ACTIONS.filter((action) => {
    const requiredPermission = NAV_PERMISSIONS[action.to];
    if (!requiredPermission) return true;
    return hasPermission(userRole, requiredPermission);
  });

  return (
    <>
      {/* Global dashboard animation keyframes */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .dash-fade-in {
            animation: dashFadeIn 0.4s ease-out both;
          }
          .dash-fade-in-delay-1 { animation-delay: 0.05s; }
          .dash-fade-in-delay-2 { animation-delay: 0.10s; }
          @keyframes dashFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0);   }
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Hero Banner ───────────────────────────────────────────── */}
        <div className="dash-fade-in">
          <DashboardHero
            displayName={displayName}
            todayLabel={todayLabel}
            greeting={greeting}
          />
        </div>

        {/* ── Stats Overview ────────────────────────────────────────── */}
        <div className="dash-fade-in dash-fade-in-delay-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Overview
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Students"
              value={totalStudents || 0}
              icon={Users}
              gradient="bg-blue-400"
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
              borderColor="border-blue-100/60"
            />
            <StatCard
              label="Total Parents"
              value={totalParents}
              icon={Users}
              gradient="bg-violet-400"
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
              borderColor="border-violet-100/60"
            />
            {canViewPayments ? (
              <StatCard
                label="Active Subscriptions"
                value={activeSubscriptions || 0}
                icon={CreditCard}
                gradient="bg-emerald-400"
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50"
                borderColor="border-emerald-100/60"
              />
            ) : (
              <StatCard
                label="Messages Sent"
                value={messagesSent || 0}
                icon={MessageSquareText}
                gradient="bg-sky-400"
                iconColor="text-sky-600"
                iconBg="bg-sky-50"
                borderColor="border-sky-100/60"
              />
            )}
            <StatCard
              label="Coaching Sessions"
              value={coachingSessions || 0}
              icon={HeartHandshake}
              gradient="bg-rose-400"
              iconColor="text-rose-500"
              iconBg="bg-rose-50"
              borderColor="border-rose-100/60"
            />
          </div>
        </div>

        {/* ── Quick Actions Grid ────────────────────────────────────── */}
        <div className="dash-fade-in dash-fade-in-delay-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900">Quick actions</h2>
                <p className="text-xs text-slate-400 mt-0.5">Jump to any authorized section instantly</p>
              </div>
            </div>

            {/* Actions grid */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {availableActions.map((action, idx) => {
                const IconColors = ACTION_COLORS[idx % ACTION_COLORS.length];
                return (
                  <Link
                    key={action.to}
                    href={action.to}
                    className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${IconColors} group-hover:scale-105 transition-transform duration-150`}>
                        <action.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-800 truncate">{action.label}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{action.sub}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all duration-150 shrink-0 ml-1.5" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
