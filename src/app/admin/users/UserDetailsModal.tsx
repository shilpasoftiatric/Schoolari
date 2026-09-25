"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  School,
  BookOpen,
  Users,
  CreditCard,
  Calendar,
  Award,
  Sparkles,
  Shield,
  MessageSquare,
  Pencil,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Briefcase,
  Layers,
  HeartHandshake,
  Flame,
} from "lucide-react";
import { formatPhoneUS } from "@/lib/phone";
import { ROLE_LABELS, type StaffRole } from "@/lib/rbac";
import { getUserFreshDetails } from "@/app/actions/admin";

const PLAN_NAMES: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || ""]: "Starter",
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_SCHOLAR || ""]: "Scholar",
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || ""]: "Elite",
};

interface UserDetailsModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onManage?: (user: any) => void;
  onSendSms?: (user: any, recipient: "student" | "parent") => void;
}

function renderValue(val: any, fallback = "—") {
  if (val === null || val === undefined || val === "") {
    return <span className="text-slate-400 font-normal">{fallback}</span>;
  }
  return <span className="text-slate-900 font-medium">{String(val)}</span>;
}

function renderTags(val: any) {
  if (!val) return <span className="text-slate-400 font-normal text-xs">—</span>;
  const arr = Array.isArray(val)
    ? val
    : typeof val === "string"
    ? val.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  if (arr.length === 0) return <span className="text-slate-400 font-normal text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {arr.map((item: string, idx: number) => (
        <span
          key={idx}
          className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200/60"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function UserDetailsModal({
  user,
  isOpen,
  onClose,
  onManage,
  onSendSms,
}: UserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "academics" | "parent" | "student" | "subscription">("overview");
  const [currentUser, setCurrentUser] = useState<any>(user);

  useEffect(() => {
    setCurrentUser(user);
    if (!isOpen || !user?.id) return;

    let isMounted = true;
    getUserFreshDetails(user.id).then((res) => {
      if (isMounted && res?.success && res?.user) {
        setCurrentUser((prev: any) => ({ ...prev, ...res.user }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentUser) return null;

  const activeUser = currentUser;

  const isStaffOrAdmin =
    activeUser.role === "admin" ||
    activeUser.role === "super_admin" ||
    (activeUser.role && activeUser.role !== "user") ||
    activeUser.account_type === "staff" ||
    activeUser.account_type === "admin";
  const isParent = activeUser.account_type === "parent";
  const isStudent = !isStaffOrAdmin && !isParent;

  const displayName = isParent
    ? activeUser.parent_first_name
      ? `${activeUser.parent_first_name} ${activeUser.parent_last_name || ""}`.trim()
      : activeUser.first_name
      ? `${activeUser.first_name} ${activeUser.last_name || ""}`.trim()
      : activeUser.email?.split("@")[0] || "Parent"
    : activeUser.student_first_name
    ? `${activeUser.student_first_name} ${activeUser.student_last_name || ""}`.trim()
    : activeUser.first_name
    ? `${activeUser.first_name} ${activeUser.last_name || ""}`.trim()
    : activeUser.email?.split("@")[0] || "Member";

  const displayEmail = isParent
    ? (activeUser.parent_email || activeUser.email || "—")
    : (activeUser.student_email || activeUser.email || "—");
  const displayPhone = isParent
    ? (activeUser.parent_phone || activeUser.phone || "")
    : (activeUser.student_phone || activeUser.phone || "");
  const hasParent = Boolean(activeUser.parent_first_name || activeUser.parent_email || activeUser.parent_phone);
  const planName =
    PLAN_NAMES[activeUser.stripe_price_id || ""] ||
    (activeUser.subscription_status === "active" ? "Active Plan" : "Free Plan");

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-3 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-4xl w-full h-[85vh] max-h-[720px] min-h-[500px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                  {displayName}
                </h2>
                {activeUser.role === "super_admin" ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-red-50 text-red-700 border border-red-200">
                    ⭐ Super Admin
                  </span>
                ) : activeUser.role === "admin" ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    ⭐ Admin
                  </span>
                ) : activeUser.role !== "user" ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-violet-50 text-violet-700 border border-violet-200">
                    🛡️ {ROLE_LABELS[activeUser.role as StaffRole] || activeUser.role}
                  </span>
                ) : activeUser.account_type === "parent" ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    👤 Parent
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    🎓 Student
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${
                    activeUser.is_active === false
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {activeUser.is_active === false ? "Inactive" : "Active"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 truncate mt-1">
                {displayEmail} {displayPhone ? `• ${formatPhoneUS(displayPhone)}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs - Stable Fixed Height Bar */}
        <div className="flex border-b border-slate-200 px-5 sm:px-6 bg-slate-50 shrink-0 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("overview")}
            className={`h-12 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "overview"
                ? "border-violet-600 text-violet-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="w-4 h-4" /> Personal & Contact
          </button>
          {isStudent && (
            <button
              onClick={() => setActiveTab("academics")}
              className={`h-12 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "academics"
                  ? "border-violet-600 text-violet-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Academics & Education
            </button>
          )}
          {isStudent && (
            <button
              onClick={() => setActiveTab("parent")}
              className={`h-12 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "parent"
                  ? "border-violet-600 text-violet-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-4 h-4" /> Parent / Guardian
            </button>
          )}
          {isParent && (
            <button
              onClick={() => setActiveTab("student")}
              className={`h-12 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "student"
                  ? "border-violet-600 text-violet-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Linked Student
            </button>
          )}
          {!isStaffOrAdmin && (
            <button
              onClick={() => setActiveTab("subscription")}
              className={`h-12 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "subscription"
                  ? "border-violet-600 text-violet-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <CreditCard className="w-4 h-4" /> Subscription & Plan
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: OVERVIEW & CONTACT */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{displayName}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{displayEmail}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {displayPhone ? formatPhoneUS(displayPhone) : <span className="text-slate-400 font-normal">—</span>}
                  </p>
                </div>
                {activeUser.state ? (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">State / Region</span>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{activeUser.state}</p>
                  </div>
                ) : isStudent ? (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">State / Region</span>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{renderValue(activeUser.state)}</p>
                  </div>
                ) : null}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Account Role / Type</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1 capitalize">
                    {activeUser.role === "user" ? `Member (${activeUser.account_type || "Student"})` : ROLE_LABELS[activeUser.role as StaffRole] || activeUser.role}
                  </p>
                </div>
                {isStudent && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Onboarding Status</span>
                    <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
                      {activeUser.onboarding_complete ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completed
                        </span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1">
                          <Clock className="w-4 h-4 text-amber-600" /> In Progress (Step {activeUser.onboarding_step || 1})
                        </span>
                      )}
                    </p>
                  </div>
                )}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Joined Date</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {activeUser.created_at
                      ? new Date(activeUser.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
                {activeUser.last_login_date ? (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Last Login</span>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {new Date(activeUser.last_login_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ) : isStudent ? (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Last Login</span>
                    <p className="text-sm font-semibold text-slate-900 mt-1">—</p>
                  </div>
                ) : null}
              </div>

              {/* Engagement Streaks & Preferences (Student Only) */}
              {isStudent && (
                <div className="p-4 bg-violet-50/60 rounded-2xl border border-violet-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
                      <Flame className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-violet-950">Study Streak</p>
                      <p className="text-sm font-semibold text-violet-800">
                        {activeUser.current_streak || 0} days active <span className="text-xs font-normal text-violet-600">(Best: {activeUser.longest_streak || 0} days)</span>
                      </p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 block">SMS Notifications</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md inline-block mt-0.5 ${activeUser.sms_opt_in ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {activeUser.sms_opt_in ? "Opted In" : "Not Subscribed"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACADEMICS & EDUCATION (Refined: Only Key Educational Metrics) */}
          {activeTab === "academics" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">High School</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{renderValue(activeUser.high_school_name)}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Grade Level</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{renderValue(activeUser.grade_level)}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Graduation Year</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{renderValue(activeUser.expected_graduation_year)}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">GPA (Unweighted / Weighted)</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {activeUser.unweighted_gpa ? `${activeUser.unweighted_gpa} (Unweighted)` : activeUser.gpa_range || "—"}
                    {activeUser.weighted_gpa ? ` / ${activeUser.weighted_gpa} (Weighted)` : ""}
                  </p>
                </div>
              </div>

              {/* Majors, Careers & Colleges */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Intended Majors & Fields of Study</span>
                  {renderTags(activeUser.intended_major || activeUser.fields_of_study)}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Career Interests</span>
                  {renderTags(activeUser.career_interest || activeUser.career_interests)}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Top Choice Colleges & Preferred School Types</span>
                  {renderTags(activeUser.top_3_schools || activeUser.preferred_college_type)}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PARENT / GUARDIAN */}
          {activeTab === "parent" && (
            <div className="space-y-4">
              {hasParent ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-violet-50/50 to-indigo-50/50 rounded-2xl border border-violet-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {activeUser.parent_first_name
                            ? `${activeUser.parent_first_name} ${activeUser.parent_last_name || ""}`
                            : "Linked Parent Profile"}
                        </h4>
                        <p className="text-xs text-slate-500">Connected Guardian Account</p>
                      </div>
                    </div>
                    {onSendSms && activeUser.parent_phone && (
                      <button
                        onClick={() => onSendSms(activeUser, "parent")}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-violet-700 border border-violet-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> SMS Parent
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Parent Full Name</span>
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {renderValue(
                          activeUser.parent_first_name
                            ? `${activeUser.parent_first_name} ${activeUser.parent_last_name || ""}`.trim()
                            : ""
                        )}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Parent Email</span>
                      <p className="text-sm font-semibold text-slate-900 mt-1 truncate">
                        {renderValue(activeUser.parent_email)}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Parent Phone Number</span>
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {activeUser.parent_phone ? formatPhoneUS(activeUser.parent_phone) : <span className="text-slate-400 font-normal">—</span>}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-500 space-y-2">
                  <Users className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No Parent / Guardian Registered</p>
                  <p className="text-xs text-slate-400">This member currently does not have a linked parent or guardian profile.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3B: LINKED STUDENT (For Parent Accounts) */}
          {activeTab === "student" && isParent && (
            <div className="space-y-4">
              {activeUser.linked_student ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-violet-50/50 to-indigo-50/50 rounded-2xl border border-violet-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {activeUser.linked_student.student_first_name
                            ? `${activeUser.linked_student.student_first_name} ${activeUser.linked_student.student_last_name || ""}`.trim()
                            : activeUser.linked_student.first_name || "Linked Student Profile"}
                        </h4>
                        <p className="text-xs text-slate-500">Connected Student Account</p>
                      </div>
                    </div>
                    {onSendSms && (activeUser.linked_student.student_phone || activeUser.linked_student.phone) && (
                      <button
                        onClick={() => onSendSms(activeUser.linked_student, "student")}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-violet-700 border border-violet-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> SMS Student
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Student Full Name</span>
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {renderValue(
                          activeUser.linked_student.student_first_name
                            ? `${activeUser.linked_student.student_first_name} ${activeUser.linked_student.student_last_name || ""}`.trim()
                            : activeUser.linked_student.first_name
                        )}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Student Email</span>
                      <p className="text-sm font-semibold text-slate-900 mt-1 truncate">
                        {renderValue(activeUser.linked_student.student_email || activeUser.linked_student.email)}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Student Phone</span>
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {(activeUser.linked_student.student_phone || activeUser.linked_student.phone)
                          ? formatPhoneUS(activeUser.linked_student.student_phone || activeUser.linked_student.phone)
                          : <span className="text-slate-400 font-normal">—</span>}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Grade Level</span>
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {renderValue(activeUser.linked_student.grade_level)}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">High School</span>
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {renderValue(activeUser.linked_student.high_school_name)}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">GPA</span>
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {activeUser.linked_student.unweighted_gpa
                          ? `${activeUser.linked_student.unweighted_gpa} (Unweighted)`
                          : activeUser.linked_student.gpa_range || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-500 space-y-2">
                  <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No Student Profile Linked</p>
                  <p className="text-xs text-slate-400">This parent account currently is not linked to an active student profile.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SUBSCRIPTION & PLAN */}
          {activeTab === "subscription" && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-violet-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-200">Current Plan</span>
                  <h3 className="text-xl font-black mt-0.5">{planName}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                    activeUser.subscription_status === "active"
                      ? "bg-emerald-400 text-emerald-950"
                      : activeUser.subscription_status === "trialing"
                      ? "bg-amber-300 text-amber-950"
                      : "bg-white/20 text-white"
                  }`}>
                    {activeUser.subscription_status || "Free Tier"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Stripe Customer ID</span>
                  <p className="text-xs font-mono font-semibold text-slate-800 mt-1 truncate">
                    {renderValue(activeUser.stripe_customer_id)}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Subscription ID</span>
                  <p className="text-xs font-mono font-semibold text-slate-800 mt-1 truncate">
                    {renderValue(activeUser.stripe_subscription_id)}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Trial Period</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {activeUser.trial_start_date ? `Trial Started on ${new Date(activeUser.trial_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "No active trial"}
                  </p>
                </div>
              </div>

              {/* AI Usage Snapshot */}
              {activeUser.usage && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Monthly AI Usage Snapshot</span>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Questions</span>
                      <span className="text-lg font-black text-slate-900">{activeUser.usage.ask_ai_count || 0}</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Essays Reviewed</span>
                      <span className="text-lg font-black text-slate-900">{activeUser.usage.essay_docs_count || activeUser.usage.essay_count || 0}</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Resumes Reviewed</span>
                      <span className="text-lg font-black text-slate-900">{activeUser.usage.resume_docs_count || activeUser.usage.resume_count || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onManage && (
              <button
                onClick={() => {
                  onClose();
                  onManage(activeUser);
                }}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> {isStaffOrAdmin ? "Edit Staff" : isParent ? "Edit Parent" : "Edit Member"}
              </button>
            )}
            {onSendSms && displayPhone && (
              <button
                onClick={() => {
                  onClose();
                  onSendSms(activeUser, activeUser.account_type === "parent" ? "parent" : "student");
                }}
                className="px-3.5 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Send SMS
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
