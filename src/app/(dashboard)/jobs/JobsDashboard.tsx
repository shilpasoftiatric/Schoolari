"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Building, Heart, FileText, ChevronRight, Sparkles, Loader2, BellRing, CheckCircle2, Trophy } from "lucide-react";
import { JobDetailPanel } from "@/app/(dashboard)/jobs/JobDetailPanel";
import Swal from "@/lib/swal";
import { toast } from "sonner";
import { saveJobToTrackerAction } from "@/app/actions/career-ai";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAIState } from "@/context/AIStateContext";

export function JobsDashboard({ 
  initialJobs = null, 
  trackedJobMap, 
  initialArticles = null 
}: { 
  initialJobs?: any[] | null, 
  trackedJobMap: any, 
  initialArticles?: any[] | null 
}) {
  const { jobsData, setJobsData, careerArticles, setCareerArticles } = useAIState();
  const [jobs, setJobs] = useState<any[] | null>(initialJobs || jobsData);
  const [tracked, setTracked] = useState(trackedJobMap);
  const [likedJobs, setLikedJobs] = useState<Record<string, boolean>>({});
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"jobs" | "articles">("jobs");
  const [articles, setArticles] = useState<any[] | null>(initialArticles || careerArticles);
  const [loading, setLoading] = useState(!jobs || !articles);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetDate, setTargetDate] = useState<string>("");
  const [targetTime, setTargetTime] = useState<string>("");
  const [jobPendingAction, setJobPendingAction] = useState<any | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleLikeJob = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    setLikedJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const handleJobAction = async (job: any, action: "will_apply" | "applied" | "won", dueDate?: string, dueTime?: string) => {
    if (processingId) return;
    setProcessingId(job.job_id);

    if (action === "will_apply") {
      setIsDialogOpen(false);
    }

    const STATUS_MAP = {
      will_apply: "Not Started",
      applied: "In Progress", // "Submitted" is "Applied" in tracker logic, wait, in TrackerDashboard it was "In Progress", wait.
      won: "Won",
    };

    // Optimistic update
    const previousStatus = tracked[job.job_id];
    setTracked((prev: any) => ({ ...prev, [job.job_id]: STATUS_MAP[action] }));

    try {
      await saveJobToTrackerAction(job, STATUS_MAP[action], dueDate, dueTime);

      if (action === "will_apply") {
        toast.success(`Saved to tracker! We'll send you a reminder.`);
      } else if (action === "applied") {
        toast.success("Marked as applied in your tracker.");
      } else if (action === "won") {
        toast.success("🏆 Congratulations! Job offer recorded.");
      }
    } catch (err: any) {
      // Rollback optimistic update on failure
      setTracked((prev: any) => ({ ...prev, [job.job_id]: previousStatus }));
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setProcessingId(null);
      setJobPendingAction(null);
      setTargetDate("");
    }
  };

  useEffect(() => {
    if (jobsData && careerArticles) {
      setJobs(jobsData);
      setArticles(careerArticles);
      setLoading(false);
    } else if (!initialJobs || !initialArticles) {
      const fetchData = async () => {
        try {
          const { getPersonalizedJobsAction } = await import("@/app/actions/career-ai");
          const { getCareerArticles } = await import("@/app/actions/career");
          
          const [j, a] = await Promise.all([
            getPersonalizedJobsAction(),
            getCareerArticles()
          ]);
          
          setJobsData(j);
          setCareerArticles(a);
          setJobs(j);
          setArticles(a);
        } catch (err) {
          console.error("Failed to load jobs:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [jobsData, careerArticles, initialJobs, initialArticles, setJobsData, setCareerArticles]);

  if (loading || !jobs || !articles) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-violet-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="font-semibold animate-pulse">Analyzing and personalizing jobs for you...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex p-1 bg-slate-100 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "jobs" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Briefcase className="w-4 h-4" /> Recommended Jobs
        </button>
        <button
          onClick={() => setActiveTab("articles")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "articles" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <FileText className="w-4 h-4" /> Career Resources
        </button>
      </div>

      {activeTab === "jobs" && (
        jobs.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500">No personalized jobs found. Make sure your profile has career interests set.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job: any, idx: number) => {
              const actionStatus = tracked[job.job_id];
              const isWon = actionStatus === "Won";
              const isApplied = actionStatus === "In Progress" || isWon;
              const isWillApply = actionStatus === "Not Started";
              const processing = processingId === job.job_id;
              const isLiked = likedJobs[job.job_id];

              return (
                <div
                  key={job.job_id || idx}
                  className={`group bg-white border rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col h-full cursor-pointer ${isWon ? "border-amber-300 bg-amber-50/20" : "border-slate-200"
                    }`}
                  onClick={() => setSelectedJob(job)}
                >
                  {/* Decorative gradient blob */}
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  {/* Header Badges & Like */}
                  <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border bg-blue-50 text-blue-700 border-blue-200">
                        {job.job_employment_type?.toLowerCase().replace("_", " ")}
                      </span>
                      <span className="flex items-center gap-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm">
                        <Sparkles className="w-3 h-3 fill-amber-500 text-amber-500" /> AI Match
                      </span>
                      {isWon && (
                        <span className="flex items-center gap-1 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm">
                          <Trophy className="w-3 h-3 fill-emerald-500 text-emerald-500" /> Won
                        </span>
                      )}
                    </div>

                    <button
                      className={`h-8 w-8 rounded-full transition-all duration-200 p-0 hover:scale-110 active:scale-95 flex items-center justify-center ${isLiked ? 'text-rose-500 bg-rose-50' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                      onClick={(e) => handleLikeJob(e, job.job_id)}
                    >
                      <Heart className="w-5 h-5 transition-all duration-300" fill={isLiked ? "currentColor" : "none"} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {job.employer_logo ? (
                          <img src={job.employer_logo} alt={job.employer_name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Building className="w-5 h-5 text-slate-400 group-hover:text-violet-500 transition-colors" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 leading-tight line-clamp-2 group-hover:text-violet-700 transition-colors">
                          {job.job_title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-600">{job.employer_name}</p>
                      </div>
                    </div>

                    {/* Badges for Location & Type */}
                    <div className="flex flex-wrap gap-2 mb-4 mt-4">
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-xs font-medium text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[150px]">{job.job_city ? `${job.job_city}, ${job.job_state}` : "Remote"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-xs font-medium text-slate-600">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[120px] capitalize">{job.job_employment_type?.toLowerCase().replace("_", " ")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-auto relative z-10 border-t border-slate-100 pt-4 flex flex-col items-stretch space-y-2" onClick={(e) => e.stopPropagation()}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">My Status</p>
                    <div className="grid grid-cols-3 gap-2">
                      {/* I Will Apply */}
                      <button
                        onClick={() => {
                          if (!isApplied && !isWon) {
                            setJobPendingAction(job);
                            setIsDialogOpen(true);
                          }
                        }}
                        disabled={processing || isApplied || isWon}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all ${isWillApply
                          ? "bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200"
                          : isApplied || isWon
                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200"
                          } ${processing ? "opacity-50 cursor-wait" : ""}`}
                      >
                        {processing && isWillApply ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className={`w-4 h-4 ${isWillApply ? "text-white" : ""}`} />}
                        <span className="leading-tight text-center">I Will Apply</span>
                        {isWillApply && !processing && <CheckCircle2 className="w-3 h-3 text-white/80" />}
                      </button>

                      {/* Applied */}
                      <button
                        onClick={() => handleJobAction(job, "applied")}
                        disabled={processing || isWon}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all ${isApplied && !isWon
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200"
                          : isWon
                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                          } ${processing ? "opacity-50 cursor-wait" : ""}`}
                      >
                        {processing && isApplied && !isWon ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className={`w-4 h-4 ${isApplied && !isWon ? "text-white" : ""}`} />}
                        <span className="leading-tight text-center">Applied</span>
                        {isApplied && !isWon && !processing && <CheckCircle2 className="w-3 h-3 text-white/80" />}
                      </button>

                      {/* Got Offer */}
                      <button
                        onClick={() => handleJobAction(job, "won")}
                        disabled={processing}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all ${isWon
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                          } ${processing ? "opacity-50 cursor-wait" : ""}`}
                      >
                        {processing && isWon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className={`w-4 h-4 ${isWon ? "text-white" : ""}`} />}
                        <span className="leading-tight text-center">Got the Job</span>
                        {isWon && !processing && <CheckCircle2 className="w-3 h-3 text-white/80" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Target Date Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Tracker</DialogTitle>
            <DialogDescription>
              When do you plan to complete and submit this application? We will add it to your dashboard tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block text-slate-700">Set Application Reminder</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="rounded-xl text-sm"
              />
              <Input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>
            <p className="text-[10px] text-slate-500 leading-tight text-center mt-3">
              You'll get an immediate calendar link & a scheduled text via Twilio SMS.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={!!processingId}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (jobPendingAction) {
                  handleJobAction(jobPendingAction, "will_apply", targetDate, targetTime);
                }
              }}
              disabled={!!processingId || !targetDate}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {processingId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save to Tracker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeTab === "articles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!initialArticles || initialArticles.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500">No career articles available at the moment. Check back later!</p>
            </div>
          ) : (
            initialArticles.map((article) => (
              <a
                key={article.id}
                href={article.external_url || "#"}
                target={article.external_url ? "_blank" : "_self"}
                rel={article.external_url ? "noopener noreferrer" : ""}
                className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-violet-200 transition-all duration-300"
              >
                {article.image_url && (
                  <div className="w-full h-40 bg-slate-100 overflow-hidden relative">
                    <img src={article.image_url} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <Badge variant="secondary" className="w-fit mb-3 bg-violet-100 text-violet-700">
                    {article.category}
                  </Badge>
                  <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-violet-700 transition-colors line-clamp-2 mb-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-3 mb-4">
                    {article.summary || article.content}
                  </p>
                  <div className="mt-auto flex items-center text-sm font-bold text-violet-600 group-hover:text-violet-700">
                    Read Article <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      )}

      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          isTracked={!!tracked[selectedJob.job_id]}
          onSave={() => {
            setTracked((prev: any) => ({ ...prev, [selectedJob.job_id]: "Not Started" }));
          }}
        />
      )}
    </>
  );
}
