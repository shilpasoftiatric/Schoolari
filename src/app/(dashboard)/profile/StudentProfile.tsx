"use client";

import { useState } from "react";
import {
  User, Phone, MapPin, GraduationCap, Award, BookOpen, Target, Sparkles,
  Edit2, Save, X, Mail, Building, Briefcase, Share2, Info, Users
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StudentProfile({ profile, email }: { profile: any; email: string }) {
  const [isEditing, setIsEditing] = useState(false);
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
      setIsEditing(false);
      Object.assign(profile, formData);
    } catch (error) {
      alert("Failed to update profile.");
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
          <p className="text-slate-900 font-medium text-sm">{value || <span className="text-slate-400 font-normal">Not provided</span>}</p>
        )}
      </div>
    );
  };

  const fullName = `${formData.student_first_name || "Student"} ${formData.student_last_name || ""}`.trim();
  const initials = (formData.student_first_name?.[0] || "") + (formData.student_last_name?.[0] || "");

  return (
    <div className="max-w-[1400px] mx-auto pb-12">

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Profile</h1>
          <p className="text-sm text-slate-500">View and manage student information</p>
        </div>
        <div className="flex items-center gap-3">
          {/* <Button variant="outline" className="rounded-xl border-slate-200 text-slate-700 bg-white shadow-sm font-semibold h-10 px-5">
            <Share2 className="w-4 h-4 mr-2" /> Share Profile
          </Button> */}
          {isEditing ? (
            <>
              <Button onClick={() => setIsEditing(false)} variant="outline" className="rounded-xl border-slate-200 bg-white font-semibold h-10">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold h-10 px-6 shadow-md shadow-violet-200">
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold h-10 px-6 shadow-md shadow-violet-200">
              <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
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
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-600">Active</span>
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
                  <p className="text-sm font-medium text-slate-900 break-all">{email}</p>
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
        </div>

        {/* Right Main Content */}
        <div className="flex-1 space-y-6 min-w-0">

          {/* Personal Information Card */}
          {/* <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <User className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-8">
              {renderField("First Name", "student_first_name", formData.student_first_name)}
              {renderField("Last Name", "student_last_name", formData.student_last_name)}
              {renderField("Mobile Number", "student_phone", formData.student_phone, "tel")}
              {renderField("State", "state", formData.state)}
              {renderField("Gender", "gender", formData.gender)}
              {renderField("Ethnicity", "ethnicity", formData.ethnicity, "text", "Comma separated", true)}
            </div>
          </div> */}

          {/* Educational Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <GraduationCap className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-bold text-slate-900">Educational Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-8">
              <div className="sm:col-span-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
              <div className="flex flex-col gap-1">
                <label className="block text-xs font-medium text-slate-500">Parent / Guardian Name</label>
                <p className="text-slate-900 font-medium text-sm">
                  {formData.parent_first_name || formData.parent_last_name
                    ? `${formData.parent_first_name || ''} ${formData.parent_last_name || ''}`.trim()
                    : <span className="text-slate-400 font-normal">Not provided</span>}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="block text-xs font-medium text-slate-500">Parent Email</label>
                <p className="text-slate-900 font-medium text-sm">{formData.parent_email || <span className="text-slate-400 font-normal">Not provided</span>}</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="block text-xs font-medium text-slate-500">Parent Phone</label>
                <p className="text-slate-900 font-medium text-sm">{formData.parent_phone || <span className="text-slate-400 font-normal">Not provided</span>}</p>
              </div>
            </div>
          </div>

          {/* Additional Information (College, Career, Activities) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <Info className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-bold text-slate-900">Additional Information</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-8 gap-x-12">

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
                    <label className="block text-xs font-medium text-slate-500">Top 3 Target Schools</label>
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
    </div>
  );
}
