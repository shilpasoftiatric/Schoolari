"use client";

import React, { useState } from "react";
import {
  ResumeDocument,
  AwardLevel
} from "@/types/resume";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  User,
  GraduationCap,
  Briefcase,
  Award,
  Sparkles,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Tag,
  Check,
  X,
  BookOpen,
  Trophy,
  Code
} from "lucide-react";
import { generateProfessionalSummaryAIAction } from "@/app/actions/resume-ai";

interface SectionEditorProps {
  resume: ResumeDocument;
  onChange: (updated: ResumeDocument) => void;
  onOpenStarModal: (bulletText: string, roleTitle: string, onApply: (newText: string) => void) => void;
}

export function ContactEditor({ resume, onChange }: SectionEditorProps) {
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const updateHeader = (key: keyof ResumeDocument["header"], value: string) => {
    onChange({
      ...resume,
      header: {
        ...resume.header,
        [key]: value
      }
    });
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const summary = await generateProfessionalSummaryAIAction(resume);
      updateHeader("summary", summary);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const inputCls =
    "h-10.5 px-3.5 bg-slate-50/70 hover:bg-slate-100/60 focus:bg-white border border-slate-200/80 focus:border-violet-500 rounded-xl text-sm text-slate-800 font-medium shadow-2xs transition-all";
  const labelCls =
    "text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100/80 flex items-center justify-center text-violet-600 shadow-2xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Contact & Header Info
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Personal details displayed at the top of your resume
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col justify-end h-full">
          <label className={labelCls}>First Name</label>
          <Input
            value={resume.header.first_name || ""}
            onChange={(e) => updateHeader("first_name", e.target.value)}
            placeholder="e.g. Maya"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col justify-end h-full">
          <label className={labelCls}>Last Name</label>
          <Input
            value={resume.header.last_name || ""}
            onChange={(e) => updateHeader("last_name", e.target.value)}
            placeholder="e.g. Lin"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col justify-end h-full">
          <label className={labelCls}>USA Phone Number</label>
          <Input
            value={resume.header.phone || ""}
            onChange={(e) => updateHeader("phone", e.target.value)}
            placeholder="+1 (512) 555-0199"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col justify-end h-full">
          <label className={labelCls}>Professional Email</label>
          <Input
            value={resume.header.email || ""}
            onChange={(e) => updateHeader("email", e.target.value)}
            placeholder="maya.lin@email.com"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col justify-end h-full">
          <label className={labelCls}>City & State (USA)</label>
          <Input
            value={resume.header.city_state || ""}
            onChange={(e) => updateHeader("city_state", e.target.value)}
            placeholder="Austin, TX"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col justify-end h-full">
          <label className={labelCls}>LinkedIn URL (Optional)</label>
          <Input
            value={resume.header.linkedin_url || ""}
            onChange={(e) => updateHeader("linkedin_url", e.target.value)}
            placeholder="linkedin.com/in/mayalin"
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Professional Summary
          </label>
          <Button
            type="button"
            onClick={handleGenerateSummary}
            disabled={generatingSummary}
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-xl text-xs font-bold text-violet-700 border border-violet-200/80 bg-violet-50/70 hover:bg-violet-100/80 transition-all shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-violet-600" />
            {generatingSummary ? "Generating..." : "AI Write Summary"}
          </Button>
        </div>
        <textarea
          value={resume.header.summary || ""}
          onChange={(e) => updateHeader("summary", e.target.value)}
          placeholder="Results-driven high school junior maintaining a 3.9 unweighted GPA with a passion for computer science and community leadership..."
          rows={3}
          className="w-full h-[10rem] rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-800 font-medium shadow-2xs transition-all"
        />
      </div>

      {/* Section 9 Additional Fields for Academic / Professional / Both */}
      {(resume.resume_type === "professional" ||
        resume.resume_type === "both" ||
        !resume.resume_type) && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Target Job or Internship Type (Professional Resume)
            </label>
            <Input
              value={resume.header.target_job_or_internship || ""}
              onChange={(e) =>
                updateHeader("target_job_or_internship", e.target.value)
              }
              placeholder="e.g. Summer AI Research Intern / Entry-Level Software Engineering Role"
              className={inputCls}
            />
          </div>
        )}

      {(resume.resume_type === "academic" ||
        resume.resume_type === "both" ||
        !resume.resume_type) && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              College or Career Goals in 1–2 Sentences (Academic Resume)
            </label>
            <textarea
              value={resume.header.college_or_career_goals || ""}
              onChange={(e) =>
                updateHeader("college_or_career_goals", e.target.value)
              }
              placeholder="e.g. Seeking admission to a competitive 4-year undergraduate computer science program with an emphasis on artificial intelligence..."
              rows={2}
              className="w-full h-[10rem] rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-800 font-medium shadow-2xs transition-all"
            />
          </div>
        )}
    </div>
  );
}

export function EducationEditor({ resume, onChange }: SectionEditorProps) {
  const addEducation = () => {
    const newEdu = {
      id: "edu-" + Date.now(),
      institution: "",
      grade_level_or_degree: "11th Grade (Junior)",
      graduation_year: "2026",
      gpa_unweighted: "4.0",
      gpa_weighted: "4.5",
      honors_coursework: "AP Computer Science, AP Calculus AB",
      location: "United States"
    };
    onChange({
      ...resume,
      education: [...resume.education, newEdu]
    });
  };

  const removeEducation = (id: string) => {
    onChange({
      ...resume,
      education: resume.education.filter((edu) => edu.id !== id)
    });
  };

  const updateEdu = (id: string, field: string, value: string) => {
    onChange({
      ...resume,
      education: resume.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    });
  };

  const inputCls =
    "h-10.5 px-3.5 bg-white/90 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-violet-500 rounded-xl text-sm text-slate-800 font-medium shadow-2xs transition-all";
  const labelCls =
    "text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shadow-2xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Education & US GPA
            </h3>
            <p className="text-xs font-medium text-slate-500">
              High school, college, coursework & academic achievements
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={addEducation}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-bold text-blue-700 border-blue-200/80 bg-blue-50/80 hover:bg-blue-100/80 h-9 px-3.5 transition-all shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Education
        </Button>
      </div>

      <div className="space-y-4">
        {resume.education.map((edu, idx) => (
          <div
            key={edu.id}
            className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-md transition-all duration-200 relative group space-y-4"
          >
            <button
              type="button"
              onClick={() => removeEducation(edu.id)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Remove education"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-6">
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>High School / College Name</label>
                <Input
                  value={edu.institution}
                  onChange={(e) => updateEdu(edu.id, "institution", e.target.value)}
                  placeholder="e.g. Oakridge High School"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Grade Level or Degree</label>
                <Input
                  value={edu.grade_level_or_degree}
                  onChange={(e) =>
                    updateEdu(edu.id, "grade_level_or_degree", e.target.value)
                  }
                  placeholder="e.g. 11th Grade (Junior) or B.S. Computer Science"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Expected Graduation Year</label>
                <Input
                  value={edu.graduation_year}
                  onChange={(e) => updateEdu(edu.id, "graduation_year", e.target.value)}
                  placeholder="2026"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>City, State</label>
                <Input
                  value={edu.location}
                  onChange={(e) => updateEdu(edu.id, "location", e.target.value)}
                  placeholder="Austin, TX"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Unweighted GPA (4.0 Scale)</label>
                <Input
                  value={edu.gpa_unweighted || ""}
                  onChange={(e) => updateEdu(edu.id, "gpa_unweighted", e.target.value)}
                  placeholder="3.9"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Weighted GPA (5.0+ Scale)</label>
                <Input
                  value={edu.gpa_weighted || ""}
                  onChange={(e) => updateEdu(edu.id, "gpa_weighted", e.target.value)}
                  placeholder="4.4"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2 flex flex-col justify-end h-full">
                <label className={labelCls}>
                  AP / IB / Dual Enrollment / Honors Coursework
                </label>
                <Input
                  value={edu.honors_coursework || ""}
                  onChange={(e) => updateEdu(edu.id, "honors_coursework", e.target.value)}
                  placeholder="e.g. AP Calculus AB, AP Physics 1, Honors English"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        ))}
        {resume.education.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-8 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
            No education added yet. Click "Add Education" above.
          </p>
        )}
      </div>
    </div>
  );
}

export function ExperienceEditor({
  resume,
  onChange,
  onOpenStarModal
}: SectionEditorProps) {
  const addExperience = () => {
    const newExp = {
      id: "exp-" + Date.now(),
      title: "",
      organization: "",
      location: "US",
      start_date: "Jan 2025",
      end_date: "Present",
      is_current: true,
      bullets: [
        "Collaborated with team members to deliver projects and improve operations."
      ]
    };
    onChange({
      ...resume,
      experience: [...resume.experience, newExp]
    });
  };

  const removeExperience = (id: string) => {
    onChange({
      ...resume,
      experience: resume.experience.filter((exp) => exp.id !== id)
    });
  };

  const updateExp = (id: string, field: string, value: any) => {
    onChange({
      ...resume,
      experience: resume.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    });
  };

  const updateBullet = (expId: string, idx: number, value: string) => {
    onChange({
      ...resume,
      experience: resume.experience.map((exp) => {
        if (exp.id !== expId) return exp;
        const newBullets = [...exp.bullets];
        newBullets[idx] = value;
        return { ...exp, bullets: newBullets };
      })
    });
  };

  const addBullet = (expId: string) => {
    onChange({
      ...resume,
      experience: resume.experience.map((exp) => {
        if (exp.id !== expId) return exp;
        return { ...exp, bullets: [...exp.bullets, ""] };
      })
    });
  };

  const removeBullet = (expId: string, idx: number) => {
    onChange({
      ...resume,
      experience: resume.experience.map((exp) => {
        if (exp.id !== expId) return exp;
        const newBullets = [...exp.bullets];
        newBullets.splice(idx, 1);
        return { ...exp, bullets: newBullets };
      })
    });
  };

  const inputCls =
    "h-10.5 px-3.5 bg-white/90 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-violet-500 rounded-xl text-sm text-slate-800 font-medium shadow-2xs transition-all";
  const labelCls =
    "text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shadow-2xs">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Work & Leadership Experience
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Jobs, internships, research, leadership & major projects
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={addExperience}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-bold text-emerald-700 border-emerald-200/80 bg-emerald-50/80 hover:bg-emerald-100/80 h-9 px-3.5 transition-all shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Experience
        </Button>
      </div>

      <div className="space-y-4">
        {resume.experience.map((exp) => (
          <div
            key={exp.id}
            className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-md transition-all duration-200 relative group space-y-4"
          >
            <button
              type="button"
              onClick={() => removeExperience(exp.id)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Remove experience"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-6">
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Job Title / Leadership Role</label>
                <Input
                  value={exp.title}
                  onChange={(e) => updateExp(exp.id, "title", e.target.value)}
                  placeholder="e.g. Software Engineering Intern or Club President"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Organization / Company Name</label>
                <Input
                  value={exp.organization}
                  onChange={(e) => updateExp(exp.id, "organization", e.target.value)}
                  placeholder="e.g. Schoolari Tech or High School Coding Club"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Start Date (Month Year)</label>
                <Input
                  value={exp.start_date}
                  onChange={(e) => updateExp(exp.id, "start_date", e.target.value)}
                  placeholder="Jun 2025"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>End Date or "Present"</label>
                <Input
                  value={exp.end_date}
                  onChange={(e) => updateExp(exp.id, "end_date", e.target.value)}
                  placeholder="Present"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  STAR Bullet Points (1-2 lines each)
                </span>
                <Button
                  type="button"
                  onClick={() => addBullet(exp.id)}
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold text-violet-600 hover:text-violet-700 h-7 px-2.5 rounded-xl hover:bg-violet-50"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Bullet
                </Button>
              </div>

              <div className="space-y-2.5">
                {exp.bullets.map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2">
                    <Input
                      value={bullet}
                      onChange={(e) => updateBullet(exp.id, bIdx, e.target.value)}
                      placeholder="Spearheaded project delivery leading to measurable results..."
                      className="bg-white hover:bg-slate-50/50 focus:bg-white border-slate-200/80 focus:border-violet-500 rounded-xl text-xs flex-1 h-9.5 shadow-2xs transition-all"
                    />
                    <Button
                      type="button"
                      onClick={() =>
                        onOpenStarModal(
                          bullet,
                          exp.title || "Student Role",
                          (newText) => updateBullet(exp.id, bIdx, newText)
                        )
                      }
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/80 text-violet-700 hover:from-violet-100 hover:to-indigo-100 shadow-2xs transition-all shrink-0"
                      title="AI STAR Polish"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-violet-600" /> AI STAR Polish
                    </Button>
                    <button
                      type="button"
                      onClick={() => removeBullet(exp.id, bIdx)}
                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      title="Remove bullet"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExtracurricularsEditor({
  resume,
  onChange,
  onOpenStarModal
}: SectionEditorProps) {
  const addExt = () => {
    const newExt = {
      id: "ext-" + Date.now(),
      activity: "",
      role: "Member",
      start_date: "Sep 2024",
      end_date: "Present",
      hours_per_week: "4 hrs/week",
      bullets: [
        "Participated in weekly club meetings and assisted with community service initiatives."
      ]
    };
    onChange({
      ...resume,
      extracurriculars: [...resume.extracurriculars, newExt]
    });
  };

  const removeExt = (id: string) => {
    onChange({
      ...resume,
      extracurriculars: resume.extracurriculars.filter((ext) => ext.id !== id)
    });
  };

  const updateExt = (id: string, field: string, value: any) => {
    onChange({
      ...resume,
      extracurriculars: resume.extracurriculars.map((ext) =>
        ext.id === id ? { ...ext, [field]: value } : ext
      )
    });
  };

  const updateBullet = (extId: string, idx: number, value: string) => {
    onChange({
      ...resume,
      extracurriculars: resume.extracurriculars.map((ext) => {
        if (ext.id !== extId) return ext;
        const newBullets = [...ext.bullets];
        newBullets[idx] = value;
        return { ...ext, bullets: newBullets };
      })
    });
  };

  const addBullet = (extId: string) => {
    onChange({
      ...resume,
      extracurriculars: resume.extracurriculars.map((ext) => {
        if (ext.id !== extId) return ext;
        return { ...ext, bullets: [...ext.bullets, ""] };
      })
    });
  };

  const removeBullet = (extId: string, idx: number) => {
    onChange({
      ...resume,
      extracurriculars: resume.extracurriculars.map((ext) => {
        if (ext.id !== extId) return ext;
        const newBullets = [...ext.bullets];
        newBullets.splice(idx, 1);
        return { ...ext, bullets: newBullets };
      })
    });
  };

  const inputCls =
    "h-10.5 px-3.5 bg-white/90 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-violet-500 rounded-xl text-sm text-slate-800 font-medium shadow-2xs transition-all";
  const labelCls =
    "text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shadow-2xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Extracurriculars & Volunteer Work
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Clubs, athletics, community service, arts & student organizations
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={addExt}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-bold text-amber-700 border-amber-200/80 bg-amber-50/80 hover:bg-amber-100/80 h-9 px-3.5 transition-all shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Activity
        </Button>
      </div>

      <div className="space-y-4">
        {resume.extracurriculars.map((ext) => (
          <div
            key={ext.id}
            className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-md transition-all duration-200 relative group space-y-4"
          >
            <button
              type="button"
              onClick={() => removeExt(ext.id)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Remove activity"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-6">
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Activity / Organization Name</label>
                <Input
                  value={ext.activity}
                  onChange={(e) => updateExt(ext.id, "activity", e.target.value)}
                  placeholder="e.g. National Honor Society"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Your Role / Leadership Title</label>
                <Input
                  value={ext.role}
                  onChange={(e) => updateExt(ext.id, "role", e.target.value)}
                  placeholder="e.g. Member or Vice President"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Hours Per Week</label>
                <Input
                  value={ext.hours_per_week || ""}
                  onChange={(e) => updateExt(ext.id, "hours_per_week", e.target.value)}
                  placeholder="e.g. 5 hrs/week"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Impact Bullets
                </span>
                <Button
                  type="button"
                  onClick={() => addBullet(ext.id)}
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold text-violet-600 hover:text-violet-700 h-7 px-2.5 rounded-xl hover:bg-violet-50"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Bullet
                </Button>
              </div>

              <div className="space-y-2.5">
                {ext.bullets.map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2">
                    <Input
                      value={bullet}
                      onChange={(e) => updateBullet(ext.id, bIdx, e.target.value)}
                      placeholder="Organized volunteer events serving 100+ community members..."
                      className="bg-white hover:bg-slate-50/50 focus:bg-white border-slate-200/80 focus:border-violet-500 rounded-xl text-xs flex-1 h-9.5 shadow-2xs transition-all"
                    />
                    <Button
                      type="button"
                      onClick={() =>
                        onOpenStarModal(
                          bullet,
                          ext.role || "Activity Member",
                          (newText) => updateBullet(ext.id, bIdx, newText)
                        )
                      }
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/80 text-violet-700 hover:from-violet-100 hover:to-indigo-100 shadow-2xs transition-all shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-violet-600" /> AI STAR Polish
                    </Button>
                    <button
                      type="button"
                      onClick={() => removeBullet(ext.id, bIdx)}
                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      title="Remove bullet"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AwardsEditor({ resume, onChange }: SectionEditorProps) {
  const addAward = () => {
    const newAward = {
      id: "awd-" + Date.now(),
      title: "",
      issuer: "",
      year: "2025",
      level: "School" as AwardLevel,
      description: ""
    };
    onChange({
      ...resume,
      awards: [...resume.awards, newAward]
    });
  };

  const removeAward = (id: string) => {
    onChange({
      ...resume,
      awards: resume.awards.filter((awd) => awd.id !== id)
    });
  };

  const updateAward = (id: string, field: string, value: any) => {
    onChange({
      ...resume,
      awards: resume.awards.map((awd) =>
        awd.id === id ? { ...awd, [field]: value } : awd
      )
    });
  };

  const levels: AwardLevel[] = ["School", "Regional", "State", "National"];

  const inputCls =
    "h-10.5 px-3.5 bg-white/90 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-violet-500 rounded-xl text-sm text-slate-800 font-medium shadow-2xs transition-all";
  const labelCls =
    "text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-yellow-50 border border-yellow-100/80 flex items-center justify-center text-yellow-600 shadow-2xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Honors & Awards
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Academic honors, scholarship awards, competitions & distinctions
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={addAward}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-bold text-yellow-700 border-yellow-200/80 bg-yellow-50/80 hover:bg-yellow-100/80 h-9 px-3.5 transition-all shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Award
        </Button>
      </div>

      <div className="space-y-4">
        {resume.awards.map((awd) => (
          <div
            key={awd.id}
            className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-md transition-all duration-200 relative group space-y-4"
          >
            <button
              type="button"
              onClick={() => removeAward(awd.id)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Remove award"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-6">
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Award / Honor Title</label>
                <Input
                  value={awd.title}
                  onChange={(e) => updateAward(awd.id, "title", e.target.value)}
                  placeholder="e.g. AP Scholar with Distinction"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Issuer / Organization</label>
                <Input
                  value={awd.issuer}
                  onChange={(e) => updateAward(awd.id, "issuer", e.target.value)}
                  placeholder="e.g. College Board or High School"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end h-full">
                <label className={labelCls}>Year</label>
                <Input
                  value={awd.year}
                  onChange={(e) => updateAward(awd.id, "year", e.target.value)}
                  placeholder="2025"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mr-1">
                Level:
              </span>
              {levels.map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => updateAward(awd.id, "level", lvl)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${awd.level === lvl
                    ? "bg-violet-600 text-white shadow-sm ring-2 ring-violet-500/20"
                    : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100/80"
                    }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkillsEditor({ resume, onChange }: SectionEditorProps) {
  const [techInput, setTechInput] = useState("");
  const [softInput, setSoftInput] = useState("");
  const [langInput, setLangInput] = useState("");

  const addSkill = (category: keyof ResumeDocument["skills"], item: string) => {
    if (!item.trim()) return;
    const list = resume.skills[category] || [];
    if (list.includes(item.trim())) return;
    onChange({
      ...resume,
      skills: {
        ...resume.skills,
        [category]: [...list, item.trim()]
      }
    });
  };

  const removeSkill = (category: keyof ResumeDocument["skills"], idx: number) => {
    const list = [...(resume.skills[category] || [])];
    list.splice(idx, 1);
    onChange({
      ...resume,
      skills: {
        ...resume.skills,
        [category]: list
      }
    });
  };

  const inputCls =
    "h-10.5 px-3.5 bg-white/90 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-violet-500 rounded-xl text-sm text-slate-800 font-medium shadow-2xs transition-all";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100/80 flex items-center justify-center text-violet-600 shadow-2xs">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Skills, Languages & Certifications
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Technical tools, soft skills, spoken languages & certificates
            </p>
          </div>
        </div>
      </div>

      {/* Technical / Hard Skills */}
      <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-sm transition-all duration-200 space-y-3">
        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
          Technical & Hard Skills
        </label>
        <div className="flex flex-wrap gap-2">
          {(resume.skills.technical || []).map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold border border-violet-200/80 shadow-2xs"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill("technical", idx)}
                className="hover:text-red-500 hover:bg-violet-100 p-0.5 rounded-md transition-colors"
                title="Remove skill"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Input
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill("technical", techInput);
                setTechInput("");
              }
            }}
            placeholder="e.g. Python, Public Speaking, Canva (Press Enter to add)"
            className={inputCls}
          />
          <Button
            type="button"
            onClick={() => {
              addSkill("technical", techInput);
              setTechInput("");
            }}
            variant="outline"
            size="sm"
            className="h-10.5 px-4 rounded-xl text-xs font-bold text-violet-700 border-violet-200/80 bg-violet-50/80 hover:bg-violet-100/80 transition-all shadow-2xs"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Soft & Leadership Skills */}
      <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-sm transition-all duration-200 space-y-3">
        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
          Soft & Leadership Skills
        </label>
        <div className="flex flex-wrap gap-2">
          {(resume.skills.soft || []).map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80 shadow-2xs"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill("soft", idx)}
                className="hover:text-red-500 hover:bg-emerald-100 p-0.5 rounded-md transition-colors"
                title="Remove skill"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Input
            value={softInput}
            onChange={(e) => setSoftInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill("soft", softInput);
                setSoftInput("");
              }
            }}
            placeholder="e.g. Team Leadership, Conflict Resolution (Press Enter to add)"
            className={inputCls}
          />
          <Button
            type="button"
            onClick={() => {
              addSkill("soft", softInput);
              setSoftInput("");
            }}
            variant="outline"
            size="sm"
            className="h-10.5 px-4 rounded-xl text-xs font-bold text-emerald-700 border-emerald-200/80 bg-emerald-50/80 hover:bg-emerald-100/80 transition-all shadow-2xs"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Languages Spoken */}
      <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-sm transition-all duration-200 space-y-3">
        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
          Languages Spoken & Written
        </label>
        <div className="flex flex-wrap gap-2">
          {(resume.skills.languages || []).map((lang, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/80 shadow-2xs"
            >
              {lang}
              <button
                type="button"
                onClick={() => removeSkill("languages", idx)}
                className="hover:text-red-500 hover:bg-blue-100 p-0.5 rounded-md transition-colors"
                title="Remove language"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Input
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill("languages", langInput);
                setLangInput("");
              }
            }}
            placeholder="e.g. English (Native), Spanish (Bilingual)"
            className={inputCls}
          />
          <Button
            type="button"
            onClick={() => {
              addSkill("languages", langInput);
              setLangInput("");
            }}
            variant="outline"
            size="sm"
            className="h-10.5 px-4 rounded-xl text-xs font-bold text-blue-700 border-blue-200/80 bg-blue-50/80 hover:bg-blue-100/80 transition-all shadow-2xs"
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}


