"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, ExternalLink, Sparkles, CheckCircle2, FileText, Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Swal from "@/lib/swal";
import { toast } from "sonner";
import { matchResumeToJobAction, saveJobToTrackerAction, generateCoverLetterDraftAction } from "@/app/actions/career-ai";
import { useRouter } from "next/navigation";

export function JobDetailPanel({ job, isOpen, onClose, isTracked, onSave }: { job: any, isOpen: boolean, onClose: () => void, isTracked: boolean, onSave: () => void }) {
  const router = useRouter();
  const [matchData, setMatchData] = useState<any>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isWriting, setIsWriting] = useState(false);

  const [showCoverLetterForm, setShowCoverLetterForm] = useState(false);
  const [coverLetterAnswers, setCoverLetterAnswers] = useState({ q1: "", q2: "", q3: "" });

  // Apply Checklist state
  const [checklist, setChecklist] = useState({
    resume: false,
    coverLetter: false,
    references: false,
    tracker: isTracked
  });

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
      const res = await generateCoverLetterDraftAction(job.job_title, job.employer_name, job.job_description, coverLetterAnswers.q1, coverLetterAnswers.q2, coverLetterAnswers.q3);
      setShowCoverLetterForm(false);
      Swal.fire({
        title: "Cover Letter Drafted!",
        text: "Your AI draft is ready in your Essays/Documents section.",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "View Draft",
        cancelButtonText: "Close"
      }).then((result) => {
        if (result.isConfirmed) {
          router.push("/essays");
        }
      });
      setChecklist(prev => ({ ...prev, coverLetter: true }));
    } catch (error) {
      Swal.fire({ title: "Error", text: "Failed to generate cover letter.", icon: "error" });
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
      <DialogContent className="max-w-6xl sm:max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 w-[100vw]">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              {job.employer_logo ? (
                <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white p-2 overflow-hidden flex-shrink-0">
                  <img src={job.employer_logo} alt={job.employer_name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Building className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                  {job.job_title}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-slate-600">
                  <span className="font-semibold flex items-center"><Building className="w-4 h-4 mr-1" /> {job.employer_name}</span>
                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {job.job_city ? `${job.job_city}, ${job.job_state}` : "Remote"}</span>
                  <Badge variant="secondary" className="font-normal capitalize">{job.job_employment_type?.toLowerCase().replace("_", " ")}</Badge>
                </div>
              </div>
            </div>
            <Button onClick={handleApply} className="bg-violet-600 hover:bg-violet-700 text-white rounded-full px-6 shadow-md shadow-violet-500/20 mr-8">
              Apply Now <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Job Description */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">About the Role</h3>
                <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
                  {job.job_description}
                </div>
              </div>
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
                    <Button onClick={handleMatch} disabled={isMatching} variant="outline" className="w-full border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800">
                      {isMatching ? "Analyzing..." : "Run AI Match"}
                    </Button>
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
                    {!showCoverLetterForm ? (
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
