"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, ExternalLink, Sparkles, CheckCircle2, FileText, Bot, Globe, Laptop, GraduationCap, Briefcase, AlertCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Swal from "@/lib/swal";
import { toast } from "sonner";
import { matchResumeToJobAction, saveJobToTrackerAction, generateCoverLetterDraftAction, getCareerAiLimitsAction } from "@/app/actions/career-ai";
import { getResumesAction } from "@/app/actions/resume";
import { useRouter } from "next/navigation";

export function JobDetailPanel({ 
  job, 
  isOpen, 
  onClose, 
  isTracked, 
  onSave,
  initialResumes = null,
  initialAiLimits = null
}: { 
  job: any; 
  isOpen: boolean; 
  onClose: () => void; 
  isTracked: boolean; 
  onSave: () => void;
  initialResumes?: any;
  initialAiLimits?: any;
}) {
  const router = useRouter();
  const [matchData, setMatchData] = useState<any>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isWriting, setIsWriting] = useState(false);

  const [resumes, setResumes] = useState<any[]>(initialResumes?.resumes || []);
  const [selectedResumeId, setSelectedResumeId] = useState<string>(
    initialResumes?.active_resume_id || (initialResumes?.resumes?.[0]?.id || "")
  );
  const [limitInfo, setLimitInfo] = useState<{ isLimitReached: boolean; isOverBudget: boolean; used: number; limit: number; resetDate: string } | null>(initialAiLimits || null);
  const [isLoadingResumes, setIsLoadingResumes] = useState<boolean>(!initialResumes?.resumes?.length);

  const [showCoverLetterForm, setShowCoverLetterForm] = useState(false);
  const [coverLetterAnswers, setCoverLetterAnswers] = useState({ q1: "", q2: "", q3: "" });

  // Sync / fetch available resumes & cover letter limits when dialog opens if not already present
  useEffect(() => {
    if (isOpen) {
      if (!resumes.length) {
        setIsLoadingResumes(true);
        getResumesAction()
          .then((payload) => {
            if (payload?.resumes && payload.resumes.length > 0) {
              setResumes(payload.resumes);
              if (payload.active_resume_id) {
                setSelectedResumeId(payload.active_resume_id);
              } else {
                setSelectedResumeId(payload.resumes[0].id);
              }
            }
          })
          .catch(() => {})
          .finally(() => setIsLoadingResumes(false));
      } else {
        setIsLoadingResumes(false);
      }

      if (!limitInfo) {
        getCareerAiLimitsAction()
          .then((limits) => {
            if (limits) setLimitInfo(limits);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, resumes.length, limitInfo]);

  // Apply Checklist state
  const [checklist, setChecklist] = useState({
    resume: false,
    coverLetter: false,
    references: false,
    tracker: isTracked
  });

  const empType = job.job_employment_type === "INTERN" ? "Internship" : job.job_employment_type === "PARTTIME" ? "Part-Time" : (job.job_employment_type || "Internship");
  const isRemote = job.workplace_type === "Remote" || (job.job_city && job.job_city.toLowerCase().includes("remote"));
  const isHybrid = job.workplace_type === "Hybrid";

  const handleMatch = async () => {
    setIsMatching(true);
    try {
      const data = await matchResumeToJobAction(job.job_description);
      setMatchData(data);
    } catch (error) {
      Swal.fire({ title: "Error", text: "Failed to run AI Resume Match.", icon: "error" });
    } finally {
      setIsMatching(false);
    }
  };

  const handleWriteCoverLetter = async () => {
    setIsWriting(true);
    try {
      const res = await generateCoverLetterDraftAction(
        job.job_title, 
        job.employer_name, 
        job.job_description, 
        coverLetterAnswers.q1, 
        coverLetterAnswers.q2, 
        coverLetterAnswers.q3,
        selectedResumeId
      );
      setShowCoverLetterForm(false);
      Swal.fire({
        title: "Cover Letter Drafted!",
        text: "Your AI draft is ready in your Essays & Cover Letters workspace.",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "View Draft",
        cancelButtonText: "Close"
      }).then((result) => {
        if (result.isConfirmed) {
          router.push(`/essays/${res.id}`);
        }
      });
      setChecklist(prev => ({ ...prev, coverLetter: true }));
    } catch (error: any) {
      Swal.fire({ title: "Error", text: error.message || "Failed to generate cover letter.", icon: "error" });
    } finally {
      setIsWriting(false);
    }
  };

  const handleApply = () => {
    window.open(job.job_apply_link, "_blank");

    // Simulate returning to the page to ask if they applied
    setTimeout(() => {
      Swal.fire({
        title: 'Did you apply?',
        text: `Did you submit your application for ${job.job_title} at ${job.employer_name}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, I applied',
        cancelButtonText: 'Not yet'
      }).then(async (result) => {
        if (result.isConfirmed) {
          await saveJobToTrackerAction(job, "Submitted");
          onSave();
          Swal.fire('Awesome!', 'Your tracker has been updated.', 'success');
        }
      });
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:w-full max-w-6xl h-[92dvh] sm:h-[90vh] max-h-[92dvh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 rounded-2xl sm:rounded-3xl border-slate-200">
        {/* Header */}
        <div className="bg-white p-4 sm:px-6 sm:py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
              {job.employer_logo ? (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-1.5 sm:p-2 overflow-hidden flex-shrink-0">
                  <img src={job.employer_logo} alt={job.employer_name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Building className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight truncate">
                  {job.job_title}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 sm:mt-1.5 text-xs sm:text-sm text-slate-600 font-medium">
                  <span className="flex items-center gap-1 truncate">
                    <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{job.employer_name}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{job.job_city} {job.job_state && `, ${job.job_state}`}</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-slate-100 text-slate-700">
                    {isRemote ? <Globe className="w-3 h-3" /> : isHybrid ? <Laptop className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                    {job.workplace_type || "On-Site"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <GraduationCap className="w-3 h-3" />
                    {empType}
                  </span>
                </div>
              </div>
            </div>
            <Button onClick={handleApply} className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white rounded-xl sm:rounded-full px-6 py-2.5 shadow-md shadow-violet-500/20 mr-0 sm:mr-8 text-xs sm:text-sm font-bold shrink-0">
              Apply Now <ExternalLink className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Left Column: Job Description & Limits */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-0 opacity-50"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 relative z-10">About the Role</h3>
                <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap relative z-10">
                  {job.job_description}
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center justify-center text-center relative z-10 bg-slate-50/50 rounded-xl p-4">
                  <p className="text-sm text-slate-500 mb-3">
                    This is a preview provided by our job partners. To view the full job description and requirements, please continue to the original posting.
                  </p>
                  <Button onClick={handleApply} variant="outline" className="w-full sm:w-auto border-violet-200 text-violet-700 hover:bg-violet-50">
                    Read Full Details & Apply <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              {/* Cover Letter Limit Alert Banner OUTSIDE and at bottom of description */}
              {limitInfo?.isLimitReached && (
                <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-orange-950 flex items-start gap-3 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold">Monthly Cover Letter Limit Reached</h4>
                    <p className="text-xs text-orange-800 mt-0.5 leading-relaxed">
                      You have created {limitInfo.used} of {limitInfo.limit} cover letters this month. Your access resets on {limitInfo.resetDate}. Upgrade your plan for more access.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: AI & Application Tools */}
            <div className="space-y-6">

              {/* AI Resume Match */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-bl-full -z-0"></div>
                <h3 className="text-md font-bold text-slate-800 mb-3 flex items-center relative z-10">
                  <Sparkles className="w-5 h-5 mr-2 text-violet-500" /> AI Resume Match
                </h3>

                {!matchData ? (
                  <div className="text-center py-4 relative z-10">
                    <p className="text-sm text-slate-500 mb-4">See how well your resume matches this job description.</p>
                    {limitInfo?.isOverBudget ? (
                      <button
                        type="button"
                        disabled
                        title={`Monthly AI budget cap reached. Resets on ${limitInfo.resetDate}.`}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                      >
                        Run AI Match (Limit Reached)
                      </button>
                    ) : (
                      <Button onClick={handleMatch} disabled={isMatching} variant="outline" className="w-full border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800">
                        {isMatching ? "Analyzing..." : "Run AI Match"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 relative z-10">
                    <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className={`text-lg font-extrabold ${matchData.score === 'Strong Match' ? 'text-emerald-600' : matchData.score === 'Good Match' ? 'text-amber-600' : 'text-rose-600'}`}>
                        {matchData.score}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{matchData.advice}</p>
                    </div>
                    {matchData.missing_skills?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Missing Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {matchData.missing_skills.map((s: string) => <Badge key={s} variant="secondary" className="bg-rose-50 text-rose-600 hover:bg-rose-100 whitespace-normal h-auto text-left py-1 leading-snug">{s}</Badge>)}
                        </div>
                      </div>
                    )}
                    <Button variant="outline" className="w-full text-xs h-8" onClick={() => router.push("/resume")}>
                      Update My Resume
                    </Button>
                  </div>
                )}
              </div>

              {/* Application Prep Checklist */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <h3 className="text-md font-bold text-slate-800 mb-4">Apply Prep Checklist</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={checklist.resume} onChange={(e) => setChecklist(p => ({ ...p, resume: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-600" />
                    <span className={`text-sm font-medium ${checklist.resume ? 'text-slate-400 line-through' : 'text-slate-700'}`}>Resume ready and uploaded</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={checklist.coverLetter} onChange={(e) => setChecklist(p => ({ ...p, coverLetter: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-600" />
                    <span className={`text-sm font-medium ${checklist.coverLetter ? 'text-slate-400 line-through' : 'text-slate-700'}`}>Cover letter generated</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={checklist.references} onChange={(e) => setChecklist(p => ({ ...p, references: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-600" />
                    <span className={`text-sm font-medium ${checklist.references ? 'text-slate-400 line-through' : 'text-slate-700'}`}>References ready</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={checklist.tracker} onChange={(e) => {
                      if (!isTracked && e.target.checked) {
                        saveJobToTrackerAction(job).then(onSave);
                      }
                      setChecklist(p => ({ ...p, tracker: e.target.checked }));
                    }} className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-600" />
                    <span className={`text-sm font-medium ${checklist.tracker ? 'text-slate-400 line-through' : 'text-slate-700'}`}>Saved in Job Tracker</span>
                  </label>
                </div>

                {!checklist.coverLetter && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    {limitInfo?.isLimitReached ? (
                      <button
                        type="button"
                        disabled
                        title={`Monthly cover letter limit reached. Resets on ${limitInfo.resetDate}.`}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                      >
                        <Bot className="w-4 h-4 text-slate-400" /> Write AI Cover Letter (Limit Reached)
                      </button>
                    ) : !showCoverLetterForm ? (
                      <Button onClick={() => setShowCoverLetterForm(true)} disabled={isWriting} className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow">
                        <Bot className="w-4 h-4 mr-2" /> Write AI Cover Letter
                      </Button>
                    ) : (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">1. Why do you want to work here?</label>
                          <textarea className="w-full text-sm rounded-md border border-slate-200 p-2 min-h-[60px]" placeholder="I love their mission..." value={coverLetterAnswers.q1} onChange={(e) => setCoverLetterAnswers(p => ({ ...p, q1: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">2. Proudest achievement relevant to this role?</label>
                          <textarea className="w-full text-sm rounded-md border border-slate-200 p-2 min-h-[60px]" placeholder="Leading a team of 5 to..." value={coverLetterAnswers.q2} onChange={(e) => setCoverLetterAnswers(p => ({ ...p, q2: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">3. Any specific skills to highlight?</label>
                          <textarea className="w-full text-sm rounded-md border border-slate-200 p-2 min-h-[60px]" placeholder="My react experience..." value={coverLetterAnswers.q3} onChange={(e) => setCoverLetterAnswers(p => ({ ...p, q3: e.target.value }))} />
                        </div>

                        {/* Select Resume dropdown AT BOTTOM OF QUESTIONS */}
                        <div className="space-y-1.5 bg-violet-50/70 p-3 rounded-xl border border-violet-100">
                          <label className="text-xs font-bold text-violet-900 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-violet-600" /> Select Resume:
                            </span>
                            {resumes.length > 0 && (
                              <span className="text-[10px] text-violet-600 font-bold bg-violet-100 px-1.5 py-0.5 rounded">
                                {resumes.length} available
                              </span>
                            )}
                          </label>

                          {isLoadingResumes ? (
                            <div className="flex items-center gap-2 text-xs text-violet-700 bg-white p-2 rounded-lg border border-violet-100 font-medium">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
                              Loading your resumes...
                            </div>
                          ) : resumes.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-violet-100">
                              No custom resumes found in vault. AI will use default profile details.
                            </p>
                          ) : (
                            <select
                              value={selectedResumeId}
                              onChange={(e) => setSelectedResumeId(e.target.value)}
                              className="w-full text-xs font-semibold rounded-lg border border-violet-200 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                              {resumes.map((r: any) => (
                                <option key={r.id} value={r.id}>
                                  {r.title || "General Resume"} ({r.header?.first_name || "Student"} {r.header?.last_name || ""})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 text-slate-600" onClick={() => setShowCoverLetterForm(false)}>Cancel</Button>
                          <Button onClick={handleWriteCoverLetter} disabled={isWriting || !coverLetterAnswers.q1 || !coverLetterAnswers.q2} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                            {isWriting ? "Drafting..." : "Generate Draft"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
