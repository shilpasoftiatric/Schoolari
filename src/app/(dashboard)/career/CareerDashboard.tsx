"use client";

import { useState, useEffect } from "react";
import { uploadDocumentAction } from "@/app/actions/documents";
import { ResumeBuilder } from "./ResumeBuilder";
import { Briefcase, Target, UploadCloud, FileText, ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MOCK_RESOURCES = [
  { type: "Internship", title: "Software Engineering Intern", company: "Google", location: "Remote", link: "#" },
  { type: "Internship", title: "Marketing Summer Analyst", company: "JPMorgan", location: "New York, NY", link: "#" },
  { type: "Course", title: "Google Data Analytics Certificate", company: "Coursera", location: "Online", link: "#" },
  { type: "Job", title: "Entry-Level Financial Analyst", company: "Deloitte", location: "Chicago, IL", link: "#" },
];

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Marketing", "Engineering", "Arts & Design", "Law", "Non-Profit"
];

export function CareerDashboard({ initialInterests, initialResumeData, uploadedResumes, initialJobs, profile }: { initialInterests: string[], initialResumeData: any, uploadedResumes: any[], initialJobs: any[], profile: any }) {
  const [interests, setInterests] = useState<string[]>(initialInterests || []);
  const [isSavingInterests, setIsSavingInterests] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [activeTab, setActiveTab] = useState<"builder" | "upload">("builder");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoadingJobs(true);
    fetch("/api/career/jobs")
      .then(res => res.json())
      .then(data => {
        if (active) {
          setJobs(data || []);
          setIsLoadingJobs(false);
        }
      })
      .catch(() => {
        if (active) setIsLoadingJobs(false);
      });
    return () => { active = false; };
  }, [refreshTrigger]);

  const toggleInterest = (industry: string) => {
    if (interests.includes(industry)) {
      setInterests(interests.filter(i => i !== industry));
    } else {
      setInterests([...interests, industry]);
    }
  };

  const handleSaveInterests = async () => {
    setIsSavingInterests(true);
    try {
      const res = await fetch("/api/career/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests })
      });
      if (!res.ok) throw new Error("Failed to update");
      alert("Career interests updated!");
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      alert("Failed to update interests.");
    } finally {
      setIsSavingInterests(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("type", "resume");

      const result = await uploadDocumentAction(formData);
      
      alert("Resume uploaded successfully! It is now securely saved in your Vault.");
    } catch (error: any) {
      alert(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-blue-500" />
          Career Center
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Prepare for the workforce, build your resume, and discover opportunities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Interests & Resources */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Career Interests Panel */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" /> Career Interests
              </h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">Select the industries you are most interested in to get tailored opportunities.</p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {INDUSTRIES.map(ind => {
                const isSelected = interests.includes(ind);
                return (
                  <button
                    key={ind}
                    onClick={() => toggleInterest(ind)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      isSelected 
                        ? "bg-rose-50 text-rose-700 border-rose-200 shadow-sm" 
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {ind}
                  </button>
                )
              })}
            </div>
            <Button onClick={handleSaveInterests} disabled={isSavingInterests} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold">
              {isSavingInterests ? "Saving..." : "Save Preferences"}
            </Button>
          </div>

          {/* Curated Resources */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-500" /> Recommended for You
            </h2>
            <div className="space-y-4">
              {isLoadingJobs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              ) : jobs && jobs.length > 0 ? (
                jobs.map((res: any, i: number) => (
                  <a key={i} href={res.link} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-amber-200 hover:bg-amber-50 transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        {res.type}
                      </span>
                      <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <h3 className="font-bold text-slate-900 leading-tight mb-1">{res.title}</h3>
                    <p className="text-xs font-medium text-slate-500">{res.company} • {res.location}</p>
                  </a>
                ))
              ) : (
                <div className="text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No student government/internship positions found for your state and interests at this time.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Resume Management */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab("builder")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "builder" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Resume Builder
            </button>
            <button 
              onClick={() => setActiveTab("upload")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Upload PDF
            </button>
          </div>

          {activeTab === "builder" ? (
            <ResumeBuilder initialData={initialResumeData} profile={profile} />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center">
              <div className="max-w-sm mx-auto">
                <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UploadCloud className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Upload Existing Resume</h3>
                <p className="text-slate-500 mb-8 text-sm">
                  Already have a polished resume? Upload the PDF here so it's securely stored in your Vault and ready for applications.
                </p>
                
                <label className="relative inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl cursor-pointer transition-all shadow-sm shadow-blue-200 overflow-hidden w-full">
                  {isUploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</>
                  ) : (
                    <><UploadCloud className="w-5 h-5" /> Select PDF File</>
                  )}
                  <input 
                    type="file" 
                    accept=".pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>

              {uploadedResumes.length > 0 && (
                <div className="mt-12 pt-8 border-t border-slate-100 text-left">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Saved in Vault</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {uploadedResumes.map((doc: any) => (
                      <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-slate-900 text-sm truncate">{doc.name}</p>
                          <p className="text-xs text-slate-500">{(doc.size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
