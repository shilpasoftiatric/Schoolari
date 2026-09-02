"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User, Phone, MapPin, GraduationCap, Award, BookOpen, Target, Sparkles,
  Edit2, Save, X, Mail, Building, Briefcase, Share2, Info, Users, Loader2, Check
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SubscriptionCard } from "@/components/ui/SubscriptionCard";

export function StudentProfile({
  profile,
  email,
  subscriptionInfo,
  aiUsage,
}: {
  profile: any;
  email: string;
  subscriptionInfo?: {
    plan: any;
    planInfo: any;
    status: string | null;
    renewalDate: string | null;
    hasSubscription: boolean;
  } | null;
  aiUsage?: any;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isMobileEditOpen, setIsMobileEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ ...profile });

  // Calculate completion
  const requiredFields = [
    "student_first_name", "state", "grade_level", "unweighted_gpa",
    "career_interest", "intended_major", "schoolari_goals",
    "gender", "ethnicity", "high_school_name", "expected_graduation_year"
  ];

  const completedFields = requiredFields.filter(field => {
    const val = formData[field];
    if (Array.isArray(val)) return val.length > 0;
    return val && String(val).trim() !== "";
  });

  const completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: formData })
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to update profile");
      }
      const data = await res.json();
      setIsEditing(false);
      setIsMobileEditOpen(false);
      Object.assign(profile, formData);

      // Phase 4: Confirmation Message
      const { toast } = await import("sonner");
      if (data.scholarshipsRefreshed || data.collegesRefreshed || data.jobsRefreshed || data.tasksRefreshed || data.resumeRefreshed) {
        let msg = "Your";
        const items = [];
        if (data.scholarshipsRefreshed) items.push("Scholarships");
        if (data.collegesRefreshed) items.push("College Recommendations");
        if (data.jobsRefreshed) items.push("Jobs");
        if (data.tasksRefreshed) items.push("Dashboard Tasks");
        if (data.resumeRefreshed) items.push("Resume");

        if (items.length === 1) {
          msg += " " + items[0] + " has been updated based on your new profile information.";
        } else {
          const lastItem = items.pop();
          msg += " " + items.join(", ") + ", and " + lastItem + " have been updated based on your new profile information.";
        }

        toast.success(msg, { duration: 5000 });
      } else {
        toast.success("Profile saved successfully.");
      }

      const { useRouter } = await import("next/navigation");
      window.location.reload(); // Hard reload guarantees Dashboard and layout are refreshed without needing complex state architecture
    } catch (error) {
      const { toast } = await import("sonner");
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleArrayChange = (field: string, value: string) => {
    const values = value.split(",").map(s => s.trim()).filter(Boolean);
    setFormData({ ...formData, [field]: values });
  };

  const renderBadges = (items: string[], colorClass: string = "bg-slate-100 text-slate-700") => {
    if (!items || items.length === 0) return <span className="text-slate-400 text-sm">Not provided</span>;
    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {items.map((item, i) => (
          <span key={i} className={`px-2 py-0.5 rounded-md text-xs font-medium ${colorClass}`}>
            {item}
          </span>
        ))}
      </div>
    );
  };

  const renderField = (label: string, name: string, value: any, type: string = "text", placeholder: string = "", isArray: boolean = false) => {
    if (isEditing) {
      if (isArray) {
        return (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">{label}</label>
            <Input
              placeholder={placeholder || `Enter ${label.toLowerCase()} (comma separated)`}
              defaultValue={(value || []).join(", ")}
              onChange={(e) => handleArrayChange(name, e.target.value)}
              className="h-9 bg-white border-slate-200 focus-visible:ring-violet-500 rounded-lg text-sm"
            />
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">{label}</label>
          <Input
            name={name}
            type={type}
            value={value || ""}
            onChange={handleChange}
            placeholder={placeholder || label}
            className="h-9 bg-white border-slate-200 focus-visible:ring-violet-500 rounded-lg text-sm"
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <label className="block text-xs font-medium text-slate-500">{label}</label>
        {isArray ? (
          renderBadges(value)
        ) : (
          <p className="text-slate-900 font-medium text-sm break-words">{value || <span className="text-slate-400 font-normal">Not provided</span>}</p>
        )}
      </div>
    );
  };

  const fullName = `${formData.student_first_name || "Student"} ${formData.student_last_name || ""}`.trim();
  const initials = (formData.student_first_name?.[0] || "") + (formData.student_last_name?.[0] || "");

  return (
    <div className="max-w-[1400px] mx-auto pb-2">

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Profile</h1>
          <p className="text-xs sm:text-sm text-slate-500">View and manage student information</p>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* <Button variant="outline" className="rounded-xl border-slate-200 text-slate-700 bg-white shadow-sm font-semibold h-10 px-5">
            <Share2 className="w-4 h-4 mr-2" /> Share Profile
          </Button> */}
          {isEditing ? (
            <>
              <Button onClick={() => setIsEditing(false)} variant="outline" className="rounded-xl border-slate-200 bg-white font-semibold h-9 sm:h-10 px-4 text-xs sm:text-sm">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold h-9 sm:h-10 px-5 sm:px-6 shadow-md shadow-violet-200 text-xs sm:text-sm">
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </>
          ) : (
            <>
              {/* Mobile Button: triggers mobile-specific popup */}
              <Button
                onClick={() => setIsMobileEditOpen(true)}
                className="md:hidden rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold h-9 px-4 shadow-md shadow-violet-200 text-xs flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Profile
              </Button>

              {/* Desktop Button: triggers inline edit */}
              <Button
                onClick={() => setIsEditing(true)}
                className="hidden md:flex rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold h-10 px-6 shadow-md shadow-violet-200 items-center"
              >
                <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Left Sidebar Profile Summary */}
        <div className="w-full lg:w-[320px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
          {/* Banner */}
          <div className="h-32 bg-violet-600 relative">
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full shadow-sm">
                <div className={`w-2 h-2 rounded-full ${profile?.subscription_status === 'trialing' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                <span className={`text-[11px] font-bold ${profile?.subscription_status === 'trialing' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                  {profile?.subscription_status === 'trialing' ? 'Trial' : 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Avatar & Basic Info */}
          <div className="px-6 relative pb-6 border-b border-slate-100">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center -mt-12 mb-4 mx-auto shadow-sm relative z-10 overflow-hidden text-2xl font-bold text-slate-400">
              {initials || "ST"}
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
              <p className="text-sm font-medium text-violet-600 mt-1">Completion: {completionPercentage}%</p>
            </div>
          </div>

          {/* Details List */}
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-4">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-0.5">Email Address</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900 break-all">{formData.student_email || email}</p>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">Verified</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-0.5">Mobile Number</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">{formData.student_phone || "-"}</p>
                  {formData.student_phone && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">Verified</span>}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-0.5">State</p>
                <p className="text-sm font-medium text-slate-900">{formData.state || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <User className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-0.5">Gender</p>
                <p className="text-sm font-medium text-slate-900">{formData.gender || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Award className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-0.5">Ethnicity</p>
                <p className="text-sm font-medium text-slate-900">{(formData.ethnicity || []).join(", ") || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Target className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-0.5">Account Type</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{formData.account_type === 'parent' ? 'Parent / Guardian' : 'Student'}</p>
              </div>
            </div>

          </div>

          {/* Subscription Card */}
          {subscriptionInfo && (
            <div className="px-6 pb-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Subscription</p>
              <SubscriptionCard
                plan={subscriptionInfo.plan}
                status={subscriptionInfo.status}
                renewalDate={subscriptionInfo.renewalDate}
                hasSubscription={subscriptionInfo.hasSubscription}
                aiUsage={aiUsage}
              />
            </div>
          )}
        </div>

        {/* Right Main Content */}
        <div className="flex-1 space-y-6 min-w-0">


          {/* Personal Information Card */}
          {isEditing && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <User className="w-5 h-5 text-violet-600" />
                <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-y-5 gap-x-6">
                {renderField("First Name", "student_first_name", formData.student_first_name)}
                {renderField("Last Name", "student_last_name", formData.student_last_name)}
                {renderField("Mobile Number", "student_phone", formData.student_phone, "tel")}
                {renderField("State", "state", formData.state)}
                {renderField("Gender", "gender", formData.gender)}
                {renderField("Ethnicity", "ethnicity", formData.ethnicity, "text", "Comma separated", true)}
              </div>
            </div>
          )}

          {/* Educational Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <GraduationCap className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-bold text-slate-900">Educational Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-y-5 gap-x-6">
              <div className="sm:col-span-2 xl:col-span-2">
                {renderField("School / Institution", "high_school_name", formData.high_school_name)}
              </div>
              {renderField("Class / Grade", "grade_level", formData.grade_level)}
              {renderField("Graduation Year", "expected_graduation_year", formData.expected_graduation_year)}
              {renderField("Unweighted GPA", "unweighted_gpa", formData.unweighted_gpa)}
              {renderField("Weighted GPA", "weighted_gpa", formData.weighted_gpa)}
              {renderField("Applied to College", "applied_to_college", formData.applied_to_college)}
              {renderField("Enrolled", "enrolled_in_college", formData.enrolled_in_college)}
            </div>
          </div>

          {/* Parent / Guardian Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <Users className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-bold text-slate-900">Parent / Guardian Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-y-5 gap-x-6">
              <div className="flex flex-col gap-1 min-w-0">
                <label className="block text-xs font-medium text-slate-500">Parent / Guardian Name</label>
                <p className="text-slate-900 font-medium text-sm break-words">
                  {formData.parent_first_name || formData.parent_last_name
                    ? `${formData.parent_first_name || ''} ${formData.parent_last_name || ''}`.trim()
                    : <span className="text-slate-400 font-normal">Not provided</span>}
                </p>
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <label className="block text-xs font-medium text-slate-500">Parent Email</label>
                <p className="text-slate-900 font-medium text-sm break-all">{formData.parent_email || <span className="text-slate-400 font-normal">Not provided</span>}</p>
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <label className="block text-xs font-medium text-slate-500">Parent Phone</label>
                <p className="text-slate-900 font-medium text-sm break-words">{formData.parent_phone || <span className="text-slate-400 font-normal">Not provided</span>}</p>
              </div>
            </div>
          </div>

          {/* Additional Information (College, Career, Activities) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <Info className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-bold text-slate-900">Additional Information</h2>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-y-6 gap-x-8">

              {/* Left col of Additional */}
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                  <div className="flex-1 w-full min-w-0">
                    {renderField("Intended Majors", "intended_major", formData.intended_major, "text", "", true)}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                  <div className="flex-1 w-full min-w-0">
                    {renderField("Preferred College Types", "preferred_college_type", formData.preferred_college_type, "text", "", true)}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                  <div className="flex-1 w-full min-w-0">
                    {renderField("Extracurricular Activities", "extracurricular_activities", formData.extracurricular_activities, "text", "", true)}
                  </div>
                </div>
              </div>

              {/* Right col of Additional */}
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <Target className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                  <div className="flex-1 w-full min-w-0">
                    {renderField("Career Interests", "career_interest", formData.career_interest, "text", "", true)}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Award className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                  <div className="flex-1 w-full min-w-0">
                    {renderField("Top Priorities (Platform Goals)", "schoolari_goals", formData.schoolari_goals, "text", "", true)}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                  <div className="flex-1 w-full min-w-0">
                    <label className="block text-xs font-medium text-slate-500">Top 3 Target Colleges</label>
                    {isEditing ? (
                      <div className="space-y-2 mt-1">
                        {[0, 1, 2].map((i) => (
                          <Input
                            key={i}
                            placeholder={`Target School ${i + 1}`}
                            value={formData.top_3_schools?.[i] || ""}
                            onChange={(e) => {
                              const newSchools = [...(formData.top_3_schools || ["", "", ""])];
                              newSchools[i] = e.target.value;
                              setFormData({ ...formData, top_3_schools: newSchools });
                            }}
                            className="h-9 bg-white border-slate-200 focus-visible:ring-violet-500 rounded-lg text-sm"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 mt-1">
                        {(formData.top_3_schools || []).filter(Boolean).length > 0 ? (
                          (formData.top_3_schools || []).filter(Boolean).map((school: string, i: number) => (
                            <div key={i} className="text-sm font-medium text-slate-900">• {school}</div>
                          ))
                        ) : (
                          <span className="text-slate-400 text-sm">Not provided</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Legal & Compliance Links */}
      <div className="mt-8 mb-1 flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm text-sm text-slate-500">
        <p>© 2026 Schoolari. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-violet-600 hover:underline font-medium transition-colors">
            Terms &amp; Conditions
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-violet-600 hover:underline font-medium transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/sms-terms" className="hover:text-violet-600 hover:underline font-medium transition-colors">
            SMS Terms
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          Mobile-Only Edit Profile Popup Dialog
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={isMobileEditOpen} onOpenChange={setIsMobileEditOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[94vw] sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-3xl bg-white shadow-2xl border-slate-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Edit2 className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                  Edit Student Profile
                </DialogTitle>
                <DialogDescription className="text-violet-100 text-[11px] sm:text-xs mt-0.5 truncate">
                  Update your personal, academic, and goal details
                </DialogDescription>
              </div>
            </div>

            <button
              onClick={() => setIsMobileEditOpen(false)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 overscroll-contain">

            {/* 1. Personal Information */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <User className="w-4 h-4 text-violet-600" />
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Personal Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">First Name</label>
                  <Input
                    name="student_first_name"
                    value={formData.student_first_name || ""}
                    onChange={handleChange}
                    placeholder="e.g. Maya"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Last Name</label>
                  <Input
                    name="student_last_name"
                    value={formData.student_last_name || ""}
                    onChange={handleChange}
                    placeholder="e.g. Lin"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">USA Phone Number</label>
                  <Input
                    name="student_phone"
                    type="tel"
                    value={formData.student_phone || ""}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">State</label>
                  <Input
                    name="state"
                    value={formData.state || ""}
                    onChange={handleChange}
                    placeholder="e.g. TX or Texas"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Gender</label>
                  <Input
                    name="gender"
                    value={formData.gender || ""}
                    onChange={handleChange}
                    placeholder="e.g. Female / Male / Non-binary"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Ethnicity (Comma separated)</label>
                  <Input
                    placeholder="e.g. Asian, Hispanic"
                    defaultValue={(formData.ethnicity || []).join(", ")}
                    onChange={(e) => handleArrayChange("ethnicity", e.target.value)}
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Educational Information */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <GraduationCap className="w-4 h-4 text-violet-600" />
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Educational Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">High School / Institution</label>
                  <Input
                    name="high_school_name"
                    value={formData.high_school_name || ""}
                    onChange={handleChange}
                    placeholder="e.g. Oakridge High School"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Grade Level / Class</label>
                  <Input
                    name="grade_level"
                    value={formData.grade_level || ""}
                    onChange={handleChange}
                    placeholder="e.g. 11th Grade (Junior)"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Graduation Year</label>
                  <Input
                    name="expected_graduation_year"
                    value={formData.expected_graduation_year || ""}
                    onChange={handleChange}
                    placeholder="2026"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Unweighted GPA (4.0 Scale)</label>
                  <Input
                    name="unweighted_gpa"
                    value={formData.unweighted_gpa || ""}
                    onChange={handleChange}
                    placeholder="3.9"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Weighted GPA (5.0+ Scale)</label>
                  <Input
                    name="weighted_gpa"
                    value={formData.weighted_gpa || ""}
                    onChange={handleChange}
                    placeholder="4.4"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Applied to College</label>
                  <Input
                    name="applied_to_college"
                    value={formData.applied_to_college || ""}
                    onChange={handleChange}
                    placeholder="Yes / No / In Progress"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Enrolled in College</label>
                  <Input
                    name="enrolled_in_college"
                    value={formData.enrolled_in_college || ""}
                    onChange={handleChange}
                    placeholder="Yes / No"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Parent / Guardian Information */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Users className="w-4 h-4 text-violet-600" />
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Parent / Guardian Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Parent First Name</label>
                  <Input
                    name="parent_first_name"
                    value={formData.parent_first_name || ""}
                    onChange={handleChange}
                    placeholder="Parent first name"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Parent Last Name</label>
                  <Input
                    name="parent_last_name"
                    value={formData.parent_last_name || ""}
                    onChange={handleChange}
                    placeholder="Parent last name"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Parent Email</label>
                  <Input
                    name="parent_email"
                    type="email"
                    value={formData.parent_email || ""}
                    onChange={handleChange}
                    placeholder="parent@email.com"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Parent Phone</label>
                  <Input
                    name="parent_phone"
                    type="tel"
                    value={formData.parent_phone || ""}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Goals, Majors & Target Colleges */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Target className="w-4 h-4 text-violet-600" />
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Majors, Goals & Colleges
                </h3>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Intended Majors (Comma separated)</label>
                  <Input
                    placeholder="e.g. Computer Science, Bioengineering"
                    defaultValue={(formData.intended_major || []).join(", ")}
                    onChange={(e) => handleArrayChange("intended_major", e.target.value)}
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Career Interests (Comma separated)</label>
                  <Input
                    placeholder="e.g. Software Engineering, AI Research"
                    defaultValue={(formData.career_interest || []).join(", ")}
                    onChange={(e) => handleArrayChange("career_interest", e.target.value)}
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Preferred College Types (Comma separated)</label>
                  <Input
                    placeholder="e.g. 4-Year University, Private, Research"
                    defaultValue={(formData.preferred_college_type || []).join(", ")}
                    onChange={(e) => handleArrayChange("preferred_college_type", e.target.value)}
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Extracurricular Activities (Comma separated)</label>
                  <Input
                    placeholder="e.g. Robotics Club, Track & Field, Math Club"
                    defaultValue={(formData.extracurricular_activities || []).join(", ")}
                    onChange={(e) => handleArrayChange("extracurricular_activities", e.target.value)}
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Platform Goals & Priorities (Comma separated)</label>
                  <Input
                    placeholder="e.g. Scholarships, College List, Essay Review"
                    defaultValue={(formData.schoolari_goals || []).join(", ")}
                    onChange={(e) => handleArrayChange("schoolari_goals", e.target.value)}
                    className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-slate-600">Top 3 Target Colleges</label>
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <Input
                        key={i}
                        placeholder={`Target School ${i + 1} (e.g. MIT, Stanford)`}
                        value={formData.top_3_schools?.[i] || ""}
                        onChange={(e) => {
                          const newSchools = [...(formData.top_3_schools || ["", "", ""])];
                          newSchools[i] = e.target.value;
                          setFormData({ ...formData, top_3_schools: newSchools });
                        }}
                        className="h-9.5 rounded-xl border-slate-200 text-sm focus-visible:ring-violet-500"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              onClick={() => setIsMobileEditOpen(false)}
              variant="outline"
              className="rounded-xl border-slate-200 bg-white font-semibold text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs h-9 px-5 shadow-md shadow-violet-200 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
