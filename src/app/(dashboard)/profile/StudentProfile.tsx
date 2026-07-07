"use client";

import { useState } from "react";
import { User, Phone, MapPin, GraduationCap, Award, BookOpen, Target, Sparkles, CheckCircle2, Edit2, Save, X } from "lucide-react";
import { updateProfile } from "@/app/actions/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function StudentProfile({ profile, email }: { profile: any; email: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ ...profile });

  // Calculate completion
  const requiredFields = [
    "first_name", "phone", "state", "grade_level", "gpa_range",
    "fields_of_study", "background_tags", "involvement_tags", "college_start"
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
      await updateProfile(formData);
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
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
            {formData.first_name || "Student"}
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
                  <Input name="first_name" value={formData.first_name} onChange={handleChange} className="h-9" />
                ) : (
                  <p className="text-slate-900 font-medium">{formData.first_name || "-"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone</label>
                {isEditing ? (
                  <Input name="phone" value={formData.phone} onChange={handleChange} className="h-9" />
                ) : (
                  <p className="text-slate-900 font-medium">{formData.phone || "-"}</p>
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
                    <option value="High School Freshman">High School Freshman</option>
                    <option value="High School Sophomore">High School Sophomore</option>
                    <option value="High School Junior">High School Junior</option>
                    <option value="High School Senior">High School Senior</option>
                    <option value="College Freshman">College Freshman</option>
                    <option value="College Sophomore">College Sophomore</option>
                    <option value="College Junior">College Junior</option>
                    <option value="College Senior">College Senior</option>
                    <option value="Graduate Student">Graduate Student</option>
                  </select>
                ) : (
                  <p className="text-slate-900 font-medium">{formData.grade_level || "-"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">GPA Range</label>
                {isEditing ? (
                  <select 
                    name="gpa_range" 
                    value={formData.gpa_range} 
                    onChange={handleChange}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select...</option>
                    <option value="3.5 - 4.0">3.5 - 4.0</option>
                    <option value="3.0 - 3.49">3.0 - 3.49</option>
                    <option value="2.5 - 2.99">2.5 - 2.99</option>
                    <option value="Below 2.5">Below 2.5</option>
                  </select>
                ) : (
                  <p className="text-slate-900 font-medium">{formData.gpa_range || "-"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Academics & Tags */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" /> Academic Profile
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Fields of Study</label>
                {isEditing ? (
                  <Input 
                    placeholder="E.g. Computer Science, Business (comma separated)"
                    defaultValue={(formData.fields_of_study || []).join(", ")}
                    onChange={(e) => handleArrayChange("fields_of_study", e.target.value)}
                  />
                ) : (
                  renderBadges(formData.fields_of_study, "bg-blue-50 text-blue-700 border border-blue-200")
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Background Tags</label>
                {isEditing ? (
                  <Input 
                    placeholder="E.g. First Generation, Low Income (comma separated)"
                    defaultValue={(formData.background_tags || []).join(", ")}
                    onChange={(e) => handleArrayChange("background_tags", e.target.value)}
                  />
                ) : (
                  renderBadges(formData.background_tags, "bg-emerald-50 text-emerald-700 border border-emerald-200")
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Involvement & Activities</label>
                {isEditing ? (
                  <Input 
                    placeholder="E.g. Debate Team, Volunteer (comma separated)"
                    defaultValue={(formData.involvement_tags || []).join(", ")}
                    onChange={(e) => handleArrayChange("involvement_tags", e.target.value)}
                  />
                ) : (
                  renderBadges(formData.involvement_tags, "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200")
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">College Start Year</label>
                {isEditing ? (
                  <Input name="college_start" value={formData.college_start} onChange={handleChange} placeholder="e.g. Fall 2025" />
                ) : (
                  <p className="text-slate-900 font-medium">{formData.college_start || "-"}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-rose-500" /> Biggest Challenge
            </h3>
            
            {isEditing ? (
              <textarea
                name="biggest_challenge"
                value={formData.biggest_challenge}
                onChange={handleChange}
                placeholder="What is the biggest challenge you're facing with college applications?"
                className="w-full resize-none rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                rows={3}
              />
            ) : (
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {formData.biggest_challenge || "No challenge specified."}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
