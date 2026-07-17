"use client";

import { useState } from "react";
import { User, Phone, MapPin, GraduationCap, Award, BookOpen, Target, Sparkles, CheckCircle2, Edit2, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function StudentProfile({ profile, email }: { profile: any; email: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ ...profile });

  // Calculate completion
  const requiredFields = [
    "student_first_name", "state", "grade_level", "unweighted_gpa",
    "career_interest", "intended_major", "schoolari_goals"
  ];
  const completedFields = requiredFields.filter(field => {
    const val = formData[field];
    if (Array.isArray(val)) return val.length > 0;
    return val && val.trim() !== "";
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
      // Ensure the UI updates to reflect saved changes
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
    const arr = formData[field] || [];
    const values = value.split(",").map(s => s.trim()).filter(Boolean);
    setFormData({ ...formData, [field]: values });
  };

  // Helper to render badges
  const renderBadges = (items: string[], colorClass: string) => {
    if (!items || items.length === 0) return <span className="text-slate-400 text-sm">None specified</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colorClass}`}>
            {item}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Hero Section: Completion Tracker & Basic Info */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-gradient-to-br from-blue-100 to-violet-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        {/* Circular Progress */}
        <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center bg-slate-50 rounded-full shadow-inner">
          <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="56" className="stroke-slate-200" strokeWidth="8" fill="none" />
            <circle 
              cx="64" cy="64" r="56" 
              className="stroke-violet-500 transition-all duration-1000 ease-out" 
              strokeWidth="8" 
              fill="none" 
              strokeDasharray={352} 
              strokeDashoffset={352 - (352 * completionPercentage) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="flex flex-col items-center z-10">
            <span className="text-2xl font-extrabold text-slate-900">{completionPercentage}%</span>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left z-10">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2 flex items-center gap-2 justify-center md:justify-start">
            {`${formData.student_first_name || "Student"} ${formData.student_last_name || ""}`.trim()}
            {formData.account_type === 'parent' ? (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md uppercase font-bold">Parent Account</span>
            ) : (
              <span className="text-xs bg-violet-100 text-violet-600 px-2 py-1 rounded-md uppercase font-bold">Student</span>
            )}
          </h2>
          <p className="text-slate-500 font-medium">{email}</p>
          
          <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-4">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {completionPercentage === 100 ? "Profile Complete!" : "Complete your profile for better matches"}
            </div>
          </div>
        </div>

        <div className="z-10">
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(false)} variant="outline" className="rounded-xl font-bold">
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="bg-slate-900 hover:bg-violet-600 text-white rounded-xl font-bold transition-all shadow-sm">
              <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Basic Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-violet-500" /> Basic Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">First Name</label>
                {isEditing ? (
                  <Input name="student_first_name" value={formData.student_first_name || ""} onChange={handleChange} className="h-9" />
                ) : (
                  <p className="text-slate-900 font-medium">{formData.student_first_name || "-"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">State</label>
                {isEditing ? (
                  <Input name="state" value={formData.state} onChange={handleChange} className="h-9" />
                ) : (
                  <p className="text-slate-900 font-medium">{formData.state || "-"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Grade Level</label>
                {isEditing ? (
                  <select 
                    name="grade_level" 
                    value={formData.grade_level} 
                    onChange={handleChange}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select...</option>
                    <option value="9th">9th</option>
                    <option value="10th">10th</option>
                    <option value="11th">11th</option>
                    <option value="12th">12th</option>
                    <option value="College Freshman">College Freshman</option>
                    <option value="College Sophomore">College Sophomore</option>
                    <option value="College Junior">College Junior</option>
                    <option value="College Senior">College Senior</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="text-slate-900 font-medium">{formData.grade_level || "-"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Unweighted GPA</label>
                {isEditing ? (
                  <select 
                    name="unweighted_gpa" 
                    value={formData.unweighted_gpa || ""} 
                    onChange={handleChange}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select...</option>
                    <option value="3.5–4.0">3.5–4.0</option>
                    <option value="3.0–3.5">3.0–3.5</option>
                    <option value="2.5–3.0">2.5–3.0</option>
                    <option value="2.0–2.5">2.0–2.5</option>
                    <option value="Under 2.0">Under 2.0</option>
                  </select>
                ) : (
                  <p className="text-slate-900 font-medium">{formData.unweighted_gpa || "-"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type of School</label>
                {isEditing ? (
                  <select 
                    name="school_type" 
                    value={formData.school_type} 
                    onChange={handleChange}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select...</option>
                    <option value="4-year university">4-year university</option>
                    <option value="Community college">Community college</option>
                    <option value="Trade school">Trade school</option>
                    <option value="Not sure">Not sure</option>
                  </select>
                ) : (
                  <p className="text-slate-900 font-medium">{formData.school_type || "-"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Financial Need</label>
                {isEditing ? (
                  <select 
                    name="financial_need" 
                    value={formData.financial_need} 
                    onChange={handleChange}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Not sure">Not sure</option>
                  </select>
                ) : (
                  <p className="text-slate-900 font-medium">{formData.financial_need || "-"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Academics & Tags */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" /> Academic & Background
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Career Interests / Intended Major</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <Input 
                      placeholder="Careers (comma separated)"
                      defaultValue={(formData.career_interest || []).join(", ")}
                      onChange={(e) => handleArrayChange("career_interest", e.target.value)}
                    />
                    <Input 
                      placeholder="Majors (comma separated)"
                      defaultValue={(formData.intended_major || []).join(", ")}
                      onChange={(e) => handleArrayChange("intended_major", e.target.value)}
                    />
                  </div>
                ) : (
                  renderBadges([...(formData.career_interest || []), ...(formData.intended_major || [])], "bg-blue-50 text-blue-700 border border-blue-200")
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Ethnicity</label>
                {isEditing ? (
                  <Input 
                    placeholder="E.g. Hispanic/Latino (comma separated)"
                    defaultValue={(formData.ethnicity || []).join(", ")}
                    onChange={(e) => handleArrayChange("ethnicity", e.target.value)}
                  />
                ) : (
                  renderBadges(formData.ethnicity, "bg-emerald-50 text-emerald-700 border border-emerald-200")
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Extracurricular Activities</label>
                {isEditing ? (
                  <Input 
                    placeholder="E.g. Sports, Arts (comma separated)"
                    defaultValue={(formData.extracurricular_activities || []).join(", ")}
                    onChange={(e) => handleArrayChange("extracurricular_activities", e.target.value)}
                  />
                ) : (
                  renderBadges(formData.extracurricular_activities, "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200")
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-rose-500" /> Top Priorities
            </h3>
            
            <div className="mb-4 text-sm text-slate-500">
              Areas where you need the most help right now:
            </div>
            
            {isEditing ? (
              <Input 
                placeholder="E.g. Finding scholarships, Writing essays (comma separated)"
                defaultValue={(formData.schoolari_goals || []).join(", ")}
                onChange={(e) => handleArrayChange("schoolari_goals", e.target.value)}
              />
            ) : (
              renderBadges(formData.schoolari_goals, "bg-rose-50 text-rose-700 border border-rose-200")
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
