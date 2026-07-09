"use client";

import { useState } from "react";
import { Plus, Trash2, Save, GraduationCap, Briefcase, Code, Loader2, Sparkles, Download, RefreshCw, Trophy, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ResumeBuilder({ initialData, profile }: { initialData: any; profile: any }) {
  const [activeResumeTab, setActiveResumeTab] = useState<"personal" | "academic">("personal");
  const [isSaving, setIsSaving] = useState(false);
  const [optimizingIndex, setOptimizingIndex] = useState<string | null>(null);

  // Initialize and migrate structures
  const [resumes, setResumes] = useState(() => {
    const defaultStructure = {
      personal: {
        education: [] as any[],
        experience: [] as any[],
        skills: [] as string[]
      },
      academic: {
        education: [] as any[],
        extracurriculars: [] as any[],
        awards: [] as any[],
        skills: [] as string[]
      }
    };
    if (!initialData) return defaultStructure;
    if (initialData.personal || initialData.academic) {
      return {
        personal: { ...defaultStructure.personal, ...initialData.personal },
        academic: { ...defaultStructure.academic, ...initialData.academic }
      };
    }
    // Backward compatibility mapping
    return {
      personal: {
        education: initialData.education || [],
        experience: initialData.experience || [],
        skills: initialData.skills || []
      },
      academic: {
        education: initialData.education || [],
        extracurriculars: [],
        awards: [],
        skills: initialData.skills || []
      }
    };
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/career/save-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: resumes })
      });
      if (!res.ok) throw new Error("Failed to save");
      alert("Resumes saved successfully!");
    } catch (error) {
      alert("Failed to save resumes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrefill = () => {
    if (!profile) return;
    const updated = { ...resumes };

    // Prefill common info
    const prefillEdu = {
      school: profile.school_type || "My High School",
      degree: profile.grade_level || "High School Student",
      year: profile.college_start || ""
    };

    if (activeResumeTab === "personal") {
      if (updated.personal.education.length === 0) {
        updated.personal.education = [prefillEdu];
      }
      if (updated.personal.skills.length === 0) {
        updated.personal.skills = profile.career_interests || [];
      }
    } else {
      if (updated.academic.education.length === 0) {
        updated.academic.education = [prefillEdu];
      }
      if (updated.academic.skills.length === 0) {
        updated.academic.skills = profile.career_interests || [];
      }
      if (updated.academic.extracurriculars.length === 0 && profile.involvement_tags) {
        updated.academic.extracurriculars = profile.involvement_tags.map((tag: string) => ({
          activity: tag,
          role: "Member",
          duration: "",
          description: ""
        }));
      }
    }

    setResumes(updated);
  };

  const handleOptimizeDescription = async (section: string, index: number, currentValue: string) => {
    if (!currentValue.trim()) return;
    const key = `${section}-${index}`;
    setOptimizingIndex(key);
    try {
      const res = await fetch("/api/career/optimize-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: currentValue })
      });
      if (!res.ok) throw new Error("AI Optimization failed");
      const json = await res.json();
      
      const updated = { ...resumes };
      updated[activeResumeTab][section][index].description = json.result;
      setResumes(updated);
    } catch (e) {
      alert("Could not optimize bullets right now.");
    } finally {
      setOptimizingIndex(null);
    }
  };

  const handleDownload = () => {
    const currentResume = resumes[activeResumeTab];
    let content = "";
    const studentName = profile?.first_name || "Student";
    const studentState = profile?.state || "";
    const studentGPA = profile?.gpa_range || "";

    if (activeResumeTab === "personal") {
      content += `=========================================\n`;
      content += `         ${studentName.toUpperCase()}'S RESUME\n`;
      content += `         State: ${studentState} | GPA: ${studentGPA}\n`;
      content += `=========================================\n\n`;
      
      content += `EDUCATION:\n`;
      currentResume.education.forEach((edu: any) => {
        content += `- ${edu.degree || 'Degree'} at ${edu.school || 'School'} (Graduation: ${edu.year || 'N/A'})\n`;
      });

      content += `\nEXPERIENCE:\n`;
      currentResume.experience.forEach((exp: any) => {
        content += `- ${exp.role || 'Role'} | ${exp.company || 'Company'} (${exp.duration || 'N/A'})\n`;
        if (exp.description) {
          const lines = exp.description.split("\n");
          lines.forEach((l: string) => {
            if (l.trim()) content += `  * ${l.trim().replace(/^[\*\-\u2022]\s*/, "")}\n`;
          });
        }
      });

      content += `\nSKILLS:\n- ${currentResume.skills.join(", ")}\n`;
    } else {
      content += `=========================================\n`;
      content += `     ${studentName.toUpperCase()}'S ACADEMIC RESUME\n`;
      content += `         State: ${studentState} | GPA: ${studentGPA}\n`;
      content += `=========================================\n\n`;

      content += `EDUCATION:\n`;
      currentResume.education.forEach((edu: any) => {
        content += `- ${edu.degree || 'Degree'} at ${edu.school || 'School'} (Graduation: ${edu.year || 'N/A'})\n`;
      });

      content += `\nEXTRACURRICULARS & INVOLVEMENT:\n`;
      currentResume.extracurriculars.forEach((ext: any) => {
        content += `- ${ext.role || 'Role'} | ${ext.activity || 'Activity'} (${ext.duration || 'N/A'})\n`;
        if (ext.description) {
          const lines = ext.description.split("\n");
          lines.forEach((l: string) => {
            if (l.trim()) content += `  * ${l.trim().replace(/^[\*\-\u2022]\s*/, "")}\n`;
          });
        }
      });

      content += `\nAWARDS & HONORS:\n`;
      currentResume.awards.forEach((awd: any) => {
        content += `- ${awd.title || 'Award'} - Issuer: ${awd.issuer || 'N/A'} (${awd.year || 'N/A'})\n`;
        if (awd.description) content += `  Description: ${awd.description}\n`;
      });

      content += `\nSKILLS & INTERESTS:\n- ${currentResume.skills.join(", ")}\n`;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${studentName.toLowerCase()}_${activeResumeTab}_resume.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateSection = (section: string, index: number, field: string, value: string) => {
    const updated = { ...resumes };
    updated[activeResumeTab][section][index][field] = value;
    setResumes(updated);
  };

  const addSectionItem = (section: string, defaultObj: any) => {
    const updated = { ...resumes };
    updated[activeResumeTab][section] = [...updated[activeResumeTab][section], defaultObj];
    setResumes(updated);
  };

  const removeSectionItem = (section: string, index: number) => {
    const updated = { ...resumes };
    updated[activeResumeTab][section].splice(index, 1);
    setResumes(updated);
  };

  const currentData = resumes[activeResumeTab];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[75vh]">
      {/* Top action header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between bg-slate-50/50 shrink-0">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveResumeTab("personal")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeResumeTab === "personal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <User className="w-3.5 h-3.5" /> Personal Resume
          </button>
          <button 
            onClick={() => setActiveResumeTab("academic")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeResumeTab === "academic" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> Academic Resume
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handlePrefill} variant="outline" className="rounded-xl font-bold text-xs h-9">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Prefill from Profile
          </Button>
          <Button onClick={handleDownload} variant="outline" className="rounded-xl font-bold text-xs h-9">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download TXT
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs h-9">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save changes
          </Button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Education */}
        <section className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-500" /> Education
            </h3>
            <button 
              onClick={() => addSectionItem("education", { school: "", degree: "", year: "" })} 
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add School
            </button>
          </div>
          <div className="space-y-4">
            {currentData.education?.map((edu: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 relative group">
                <button 
                  onClick={() => removeSectionItem('education', i)} 
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-8">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">School Name</label>
                    <Input value={edu.school || ""} onChange={(e) => updateSection('education', i, 'school', e.target.value)} placeholder="e.g. Oakridge High School" className="bg-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Graduation / Completion Year</label>
                    <Input value={edu.year || ""} onChange={(e) => updateSection('education', i, 'year', e.target.value)} placeholder="e.g. 2026" className="bg-white" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Degree / Major / Program</label>
                    <Input value={edu.degree || ""} onChange={(e) => updateSection('education', i, 'degree', e.target.value)} placeholder="e.g. AP Scholar, Honor Roll" className="bg-white" />
                  </div>
                </div>
              </div>
            ))}
            {(!currentData.education || currentData.education.length === 0) && (
              <p className="text-xs text-slate-500 italic">No education details added yet. Click prefill or add new above.</p>
            )}
          </div>
        </section>

        {/* Work / Extracurricular experience based on Active Tab */}
        {activeResumeTab === "personal" ? (
          <section className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-500" /> Professional Experience
              </h3>
              <button 
                onClick={() => addSectionItem("experience", { company: "", role: "", duration: "", description: "" })} 
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience
              </button>
            </div>
            <div className="space-y-4">
              {currentData.experience?.map((exp: any, i: number) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 relative group">
                  <button 
                    onClick={() => removeSectionItem('experience', i)} 
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-8">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Company / Organization</label>
                      <Input value={exp.company || ""} onChange={(e) => updateSection('experience', i, 'company', e.target.value)} placeholder="Company Name" className="bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Duration</label>
                      <Input value={exp.duration || ""} onChange={(e) => updateSection('experience', i, 'duration', e.target.value)} placeholder="e.g. Jun 2023 - Aug 2023" className="bg-white" />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Role / Title</label>
                      <Input value={exp.role || ""} onChange={(e) => updateSection('experience', i, 'role', e.target.value)} placeholder="e.g. Software Engineering Intern" className="bg-white" />
                    </div>
                    <div className="sm:col-span-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase">Description / Bullets</label>
                        <button 
                          onClick={() => handleOptimizeDescription("experience", i, exp.description || "")}
                          disabled={optimizingIndex === `experience-${i}`}
                          className="text-[10px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 bg-violet-50 px-2 py-0.5 rounded-md"
                        >
                          {optimizingIndex === `experience-${i}` ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Optimizing...</>
                          ) : (
                            <><Sparkles className="w-3 h-3 text-amber-500" /> Rewrite Bullets with Claude AI</>
                          )}
                        </button>
                      </div>
                      <textarea 
                        value={exp.description || ""} 
                        onChange={(e) => updateSection('experience', i, 'description', e.target.value)} 
                        placeholder="e.g. Led a team of 4 to design client software, improving performance by 20%." 
                        className="w-full bg-white rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 h-24 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!currentData.experience || currentData.experience.length === 0) && (
                <p className="text-xs text-slate-500 italic">No experience added yet. Click add above to record work experience.</p>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* Extracurriculars */}
            <section className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-orange-500" /> Extracurricular Activities
                </h3>
                <button 
                  onClick={() => addSectionItem("extracurriculars", { activity: "", role: "", duration: "", description: "" })} 
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Activity
                </button>
              </div>
              <div className="space-y-4">
                {currentData.extracurriculars?.map((ext: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 relative group">
                    <button 
                      onClick={() => removeSectionItem('extracurriculars', i)} 
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-8">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Activity / Club Name</label>
                        <Input value={ext.activity || ""} onChange={(e) => updateSection('extracurriculars', i, 'activity', e.target.value)} placeholder="e.g. Student Council, Robotics Club" className="bg-white" />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Duration / Season</label>
                        <Input value={ext.duration || ""} onChange={(e) => updateSection('extracurriculars', i, 'duration', e.target.value)} placeholder="e.g. Fall 2024" className="bg-white" />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Position / Role</label>
                        <Input value={ext.role || ""} onChange={(e) => updateSection('extracurriculars', i, 'role', e.target.value)} placeholder="e.g. Club President, Treasurer" className="bg-white" />
                      </div>
                      <div className="sm:col-span-3">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase">Impact Description</label>
                          <button 
                            onClick={() => handleOptimizeDescription("extracurriculars", i, ext.description || "")}
                            disabled={optimizingIndex === `extracurriculars-${i}`}
                            className="text-[10px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 bg-violet-50 px-2 py-0.5 rounded-md"
                          >
                            {optimizingIndex === `extracurriculars-${i}` ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Optimizing...</>
                            ) : (
                              <><Sparkles className="w-3 h-3 text-amber-500" /> Rewrite Bullets with Claude AI</>
                            )}
                          </button>
                        </div>
                        <textarea 
                          value={ext.description || ""} 
                          onChange={(e) => updateSection('extracurriculars', i, 'description', e.target.value)} 
                          placeholder="e.g. Organised weekly club meetings, planned fundraiser raising $500." 
                          className="w-full bg-white rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 h-24 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {(!currentData.extracurriculars || currentData.extracurriculars.length === 0) && (
                  <p className="text-xs text-slate-500 italic">No extracurricular items added yet. Click add above to record activities.</p>
                )}
              </div>
            </section>

            {/* Awards & Honors */}
            <section className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" /> Awards & Honors
                </h3>
                <button 
                  onClick={() => addSectionItem("awards", { title: "", issuer: "", year: "", description: "" })} 
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Award
                </button>
              </div>
              <div className="space-y-4">
                {currentData.awards?.map((awd: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 relative group">
                    <button 
                      onClick={() => removeSectionItem('awards', i)} 
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-8">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Award Title</label>
                        <Input value={awd.title || ""} onChange={(e) => updateSection('awards', i, 'title', e.target.value)} placeholder="e.g. National Merit Scholar" className="bg-white" />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Year Received</label>
                        <Input value={awd.year || ""} onChange={(e) => updateSection('awards', i, 'year', e.target.value)} placeholder="e.g. 2025" className="bg-white" />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Issuing Organization</label>
                        <Input value={awd.issuer || ""} onChange={(e) => updateSection('awards', i, 'issuer', e.target.value)} placeholder="e.g. College Board" className="bg-white" />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 block">Additional Details</label>
                        <Input value={awd.description || ""} onChange={(e) => updateSection('awards', i, 'description', e.target.value)} placeholder="e.g. Awarded to top 1% of students." className="bg-white" />
                      </div>
                    </div>
                  </div>
                ))}
                {(!currentData.awards || currentData.awards.length === 0) && (
                  <p className="text-xs text-slate-500 italic">No awards added yet. Click add above to record honors.</p>
                )}
              </div>
            </section>
          </>
        )}

        {/* Skills */}
        <section className="space-y-4">
          <div className="flex items-center pb-2 border-b border-slate-100">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Code className="w-5 h-5 text-fuchsia-500" /> Skills
            </h3>
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase mb-2 block">List skills (Comma Separated)</label>
            <Input 
              value={currentData.skills?.join(", ") || ""} 
              onChange={(e) => {
                const updated = { ...resumes };
                updated[activeResumeTab].skills = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                setResumes(updated);
              }} 
              placeholder="e.g. Python, Public Speaking, Spanish, Graphic Design" 
              className="bg-slate-50 border-slate-200" 
            />
          </div>
        </section>
      </div>
    </div>
  );
}
