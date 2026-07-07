"use client";

import { useState } from "react";
import { saveResume } from "@/app/actions/career";
import { Plus, Trash2, Save, GraduationCap, Briefcase, Code, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ResumeBuilder({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData || {
    education: [],
    experience: [],
    skills: []
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveResume(data);
      alert("Resume saved successfully!");
    } catch (error) {
      alert("Failed to save resume.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSection = (section: string, index: number, field: string, value: string) => {
    const newData = { ...data };
    newData[section][index][field] = value;
    setData(newData);
  };

  const addEducation = () => setData({ ...data, education: [...data.education, { school: "", degree: "", year: "" }] });
  const addExperience = () => setData({ ...data, experience: [...data.experience, { company: "", role: "", duration: "", description: "" }] });
  const removeSection = (section: string, index: number) => {
    const newData = { ...data };
    newData[section].splice(index, 1);
    setData(newData);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
        <h2 className="text-xl font-extrabold text-slate-900">Resume Builder</h2>
        <Button onClick={handleSave} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Resume
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Education */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-500" /> Education
            </h3>
            <button onClick={addEducation} className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="space-y-4">
            {data.education.map((edu: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 relative group">
                <button onClick={() => removeSection('education', i)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-2 gap-4 pr-8">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">School</label>
                    <Input value={edu.school} onChange={(e) => updateSection('education', i, 'school', e.target.value)} placeholder="University Name" className="bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Graduation Year</label>
                    <Input value={edu.year} onChange={(e) => updateSection('education', i, 'year', e.target.value)} placeholder="e.g. 2026" className="bg-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Degree / Major</label>
                    <Input value={edu.degree} onChange={(e) => updateSection('education', i, 'degree', e.target.value)} placeholder="B.S. Computer Science" className="bg-white" />
                  </div>
                </div>
              </div>
            ))}
            {data.education.length === 0 && <p className="text-sm text-slate-500 italic">No education added yet.</p>}
          </div>
        </section>

        {/* Experience */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-500" /> Experience
            </h3>
            <button onClick={addExperience} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="space-y-4">
            {data.experience.map((exp: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 relative group">
                <button onClick={() => removeSection('experience', i)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-2 gap-4 pr-8">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Company / Org</label>
                    <Input value={exp.company} onChange={(e) => updateSection('experience', i, 'company', e.target.value)} placeholder="Company Name" className="bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Duration</label>
                    <Input value={exp.duration} onChange={(e) => updateSection('experience', i, 'duration', e.target.value)} placeholder="e.g. Jun 2023 - Aug 2023" className="bg-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Role</label>
                    <Input value={exp.role} onChange={(e) => updateSection('experience', i, 'role', e.target.value)} placeholder="Software Engineering Intern" className="bg-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Description</label>
                    <textarea 
                      value={exp.description} 
                      onChange={(e) => updateSection('experience', i, 'description', e.target.value)} 
                      placeholder="Bullet points about what you did..." 
                      className="w-full bg-white rounded-md border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 h-24 resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
            {data.experience.length === 0 && <p className="text-sm text-slate-500 italic">No experience added yet.</p>}
          </div>
        </section>

        {/* Skills */}
        <section>
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Code className="w-5 h-5 text-fuchsia-500" /> Skills
            </h3>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">List your skills (Comma Separated)</label>
            <Input 
              value={data.skills.join(", ")} 
              onChange={(e) => setData({ ...data, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} 
              placeholder="e.g. Python, Public Speaking, Leadership" 
              className="bg-slate-50 border-slate-200" 
            />
          </div>
        </section>

      </div>
    </div>
  );
}
