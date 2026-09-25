"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, ExternalLink, Sparkles, CheckCircle2, FileText, Bot, Globe, Laptop, GraduationCap, Briefcase, AlertCircle, Loader2, Heart, CalendarCheck2, HelpCircle, Lightbulb, Star, Bookmark, Trophy } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Swal from "@/lib/swal";
import { toast } from "sonner";
import { 
  matchResumeToJobAction, 
  saveJobToTrackerAction, 
  generateCoverLetterDraftAction, 
  getCareerAiLimitsAction, 
  getJobInterviewQuestionsAction,
  saveInterviewPracticeToTrackerAction,
  getJobInterviewPrepAction
} from "@/app/actions/career-ai";
import { getResumesAction } from "@/app/actions/resume";
import { useRouter } from "next/navigation";
import { StarInterviewPracticeView } from "./StarInterviewPracticeModal";
import { StarPracticeEntry } from "@/types/interview";

export function JobDetailPanel({
  job,
  isOpen,
  onClose,
  isTracked,
  onSave,
  initialResumes = null,
  initialAiLimits = null,
  isWishlisted = false,
  onToggleWishlist,
}: {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  isTracked: boolean;
  onSave: () => void;
  initialResumes?: any;
  initialAiLimits?: any;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
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

  // Interview Prep state
  const [interviewQuestions, setInterviewQuestions] = useState<any>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [starredQuestions, setStarredQuestions] = useState<Record<string, boolean>>({});
  const [practiceEntries, setPracticeEntries] = useState<Record<string, StarPracticeEntry>>({});
  const [activePracticeQuestion, setActivePracticeQuestion] = useState<any | null>(null);
  const applyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up any pending apply prompt timer on unmount
  useEffect(() => {
    return () => {
      if (applyTimeoutRef.current) {
        clearTimeout(applyTimeoutRef.current);
      }
    };
  }, []);

  // Sync / fetch available resumes, cover letter limits & saved interview prep
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
          .catch(() => { })
          .finally(() => setIsLoadingResumes(false));
      } else {
        setIsLoadingResumes(false);
      }

      if (!limitInfo) {
        getCareerAiLimitsAction()
          .then((limits) => {
            if (limits) setLimitInfo(limits);
          })
          .catch(() => { });
      }

      if (job?.job_id) {
        getJobInterviewPrepAction(String(job.job_id))
          .then((prep) => {
            if (prep) {
              if (Array.isArray(prep.starred_questions)) {
                const starMap: Record<string, boolean> = {};
                prep.starred_questions.forEach((qId: string) => { starMap[qId] = true; });
                setStarredQuestions(starMap);
              }
              if (Array.isArray(prep.practice_entries)) {
                const entryMap: Record<string, StarPracticeEntry> = {};
                prep.practice_entries.forEach((entry: StarPracticeEntry) => { entryMap[entry.questionId] = entry; });
                setPracticeEntries(entryMap);
              }
            }
          })
          .catch(() => { });
      }
    }
  }, [isOpen, resumes.length, limitInfo, job?.job_id]);

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

  const titleLower = (job.job_title || "").toLowerCase();
  const descLower = (job.job_description || "").toLowerCase();
  const isFws =
    job.is_fws ||
    job.job_employment_type === "Work-Study" ||
    titleLower.includes("work study") ||
    titleLower.includes("work-study") ||
    titleLower.includes("federal work study") ||
    titleLower.includes("fws") ||
    titleLower.includes("student assistant") ||
    descLower.includes("work study") ||
    descLower.includes("federal work study") ||
    descLower.includes("fws eligible");

  const handleToggleStar = async (questionId: string) => {
    const nextStarred = { ...starredQuestions, [questionId]: !starredQuestions[questionId] };
    setStarredQuestions(nextStarred);
    const starredList = Object.keys(nextStarred).filter((k) => nextStarred[k]);
    try {
      await saveInterviewPracticeToTrackerAction({
        jobId: String(job.job_id),
        jobData: job,
        starredQuestions: starredList,
        practiceEntries: Object.values(practiceEntries),
      });
      if (nextStarred[questionId]) {
        toast.success("Question starred in your interview prep list!");
      }
    } catch (err) {
      console.error("Failed to persist star status:", err);
    }
  };

  const handleOpenPractice = (q: any, index: number) => {
    const qId = q.id || `q_${index}`;
    setActivePracticeQuestion({ ...q, id: qId });
  };

  const handleSavePracticeEntry = async (entry: StarPracticeEntry) => {
    const nextEntries = { ...practiceEntries, [entry.questionId]: entry };
    setPracticeEntries(nextEntries);
    const starredList = Object.keys(starredQuestions).filter((k) => starredQuestions[k]);
    await saveInterviewPracticeToTrackerAction({
      jobId: String(job.job_id),
      jobData: job,
      starredQuestions: starredList,
      practiceEntries: Object.values(nextEntries),
    });
  };

  const handleGetInterviewPrep = async () => {
    setIsLoadingQuestions(true);
    try {
      const data = await getJobInterviewQuestionsAction(
        job.job_title,
        job.employer_name,
        job.job_description,
        selectedResumeId
      );
      setInterviewQuestions(data);
      toast.success("5-7 Interview Practice Questions generated!");
    } catch (error) {
      Swal.fire({ title: "Error", text: "Failed to generate interview practice questions.", icon: "error" });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleMatch = async () => {
    setIsMatching(true);
    try {
      const data = await matchResumeToJobAction(
        job.job_description,
        selectedResumeId,
        job.job_title,
        job.employer_name
      );
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

    if (applyTimeoutRef.current) {
      clearTimeout(applyTimeoutRef.current);
    }

    // Prompt user to update status after returning
    applyTimeoutRef.current = setTimeout(() => {
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
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        if (applyTimeoutRef.current) {
          clearTimeout(applyTimeoutRef.current);
          applyTimeoutRef.current = null;
        }
        setActivePracticeQuestion(null);
        onClose();
      }
    }}>
      <DialogContent className="w-[95vw] sm:w-[94vw] md:w-[92vw] lg:w-[88vw] xl:w-[84vw] max-w-6xl sm:max-w-6xl md:max-w-6xl lg:max-w-6xl xl:max-w-6xl h-auto max-h-[96dvh] sm:max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 rounded-2xl sm:rounded-3xl border-slate-200 shadow-2xl">
        {activePracticeQuestion ? (
          <StarInterviewPracticeView
            jobTitle={job.job_title}
            employerName={job.employer_name}
            question={activePracticeQuestion}
            initialPracticeEntry={practiceEntries[activePracticeQuestion.id] || null}
            onBack={() => setActivePracticeQuestion(null)}
            onSavePractice={handleSavePracticeEntry}
          />
        ) : (
          <>
            {/* Header */}
            <div className="bg-white p-4 sm:px-6 sm:py-5 border-b border-slate-200 flex-shrink-0">
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
                <DialogTitle className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">
                  {job.job_title}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 sm:mt-1.5 text-xs sm:text-sm text-slate-600 font-medium">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                    <span>{job.employer_name}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                    <span>{job.job_city} {job.job_state && `, ${job.job_state}`}</span>
                  </span>
                  <span>•</span>
                  {isFws && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                      FWS Eligible
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-slate-100 text-slate-700">
                    {isRemote ? <Globe className="w-3 h-3" /> : isHybrid ? <Laptop className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                    {job.workplace_type || "On-Site"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <GraduationCap className="w-3 h-3" />
                    {isFws ? "Work-Study" : empType}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 mr-0 sm:mr-8 w-full sm:w-auto">
              {onToggleWishlist && (
                <button
                  type="button"
                  onClick={onToggleWishlist}
                  title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0 ${isWishlisted
                    ? "bg-rose-50 text-rose-500 border-rose-200 shadow-xs"
                    : "bg-white text-slate-400 border-slate-200 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200"
                    }`}
                >
                  <Heart className="w-5 h-5" fill={isWishlisted ? "currentColor" : "none"} />
                </button>
              )}
              <Button onClick={handleApply} className="flex-1 sm:flex-none bg-violet-600 hover:bg-violet-700 text-white rounded-xl sm:rounded-full px-6 py-2.5 shadow-md shadow-violet-500/20 text-xs sm:text-sm font-bold">
                Apply Now <ExternalLink className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

            {/* Left Column: Job Description & Limits */}
            <div className="md:col-span-7 lg:col-span-8 space-y-4">
              {/* US Federal Work-Study Financial Aid Advisory */}
              {isFws && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 shadow-xs animate-in fade-in">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-extrabold text-emerald-900 text-xs sm:text-sm flex items-center gap-1.5">
                      Federal Work-Study (FWS) Position
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/70 text-emerald-800">
                        FAFSA Required
                      </span>
                    </div>
                    <p className="text-emerald-800/90 mt-1 leading-relaxed">
                      This opportunity is funded through the <strong>U.S. Department of Education Federal Work-Study Program</strong>. To qualify, you must have submitted your <strong>FAFSA</strong>, received a valid Student Aid Index (SAI), and been awarded Work-Study in your college financial aid package.
                    </p>
                  </div>
                </div>
              )}

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

              {/* Interview Prep & Likely Questions */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md sm:text-lg font-bold text-slate-800 flex items-center">
                    <CalendarCheck2 className="w-5 h-5 mr-2 text-purple-600" />
                    Interview Prep & Likely Questions
                  </h3>
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold">
                    Claude AI
                  </Badge>
                </div>

                {!interviewQuestions ? (
                  <div className="text-center py-4 space-y-3 bg-purple-50/30 rounded-xl p-4 border border-purple-100/50">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                      Prepare with 5–7 tailored behavioral and role-specific interview questions generated by Claude AI based on this role.
                    </p>
                    <Button
                      onClick={handleGetInterviewPrep}
                      disabled={isLoadingQuestions}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-xs px-6 py-2"
                    >
                      {isLoadingQuestions ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Questions...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1.5" />
                          Generate Practice Questions
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    {interviewQuestions.general_advice && (
                      <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl text-xs sm:text-sm text-purple-900 font-medium">
                        💡 <strong>Pro Strategy:</strong> {interviewQuestions.general_advice}
                      </div>
                    )}

                    <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                      {interviewQuestions.questions?.map((q: any, i: number) => {
                        const qId = q.id || `q_${i}`;
                        const isStarred = Boolean(starredQuestions[qId]);
                        const practiceEntry = practiceEntries[qId];

                        return (
                          <div 
                            key={i} 
                            className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                              isStarred 
                                ? "bg-purple-50/40 border-purple-200 shadow-xs" 
                                : "bg-slate-50 border-slate-200/80"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                  Question {i + 1}
                                </span>
                                <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                  {q.type || "Interview Question"}
                                </span>
                                {isStarred && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Starred
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleStar(qId)}
                                title={isStarred ? "Unstar question" : "Star this question for priority prep"}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  isStarred 
                                    ? "bg-amber-50 text-amber-500 border-amber-200" 
                                    : "bg-white text-slate-400 border-slate-200 hover:text-amber-500 hover:bg-amber-50"
                                }`}
                              >
                                <Star className="w-3.5 h-3.5" fill={isStarred ? "currentColor" : "none"} />
                              </button>
                            </div>

                            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {q.question}
                            </p>

                            {q.tip && (
                              <p className="text-[11px] sm:text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <span>{q.tip}</span>
                              </p>
                            )}

                            {/* STAR Practice Status & Trigger Button */}
                            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 mt-1">
                              {practiceEntry?.evaluation ? (
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 ${
                                    practiceEntry.evaluation.score >= 80 
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                      : practiceEntry.evaluation.score >= 65 
                                      ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                      : "bg-rose-100 text-rose-800 border border-rose-200"
                                  }`}>
                                    <Trophy className="w-3 h-3" />
                                    STAR: {practiceEntry.evaluation.score}/100 • {practiceEntry.evaluation.rating}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Not practiced yet
                                </span>
                              )}

                              <Button
                                size="sm"
                                variant={practiceEntry ? "outline" : "default"}
                                onClick={() => handleOpenPractice(q, i)}
                                className={`text-[11px] font-bold h-7 px-3 rounded-lg ${
                                  practiceEntry 
                                    ? "border-purple-200 text-purple-700 hover:bg-purple-50" 
                                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                                }`}
                              >
                                {practiceEntry ? "Review / Edit STAR Answer" : "Practice with STAR Method"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleGetInterviewPrep}
                      disabled={isLoadingQuestions}
                      className="w-full text-xs sm:text-sm font-bold text-purple-700 border-purple-200 hover:bg-purple-50"
                    >
                      {isLoadingQuestions ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                      Regenerate Questions
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: AI & Application Tools */}
            <div className="md:col-span-5 lg:col-span-4 space-y-6">

              {/* AI Resume Match */}
              {/* AI Resume Match */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-bl-full -z-0"></div>
                <div className="flex items-center justify-between mb-3 relative z-10 gap-2">
                  <h3 className="text-md font-bold text-slate-800 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-violet-500" /> AI Resume Match
                  </h3>
                  {resumes.length > 1 && (
                    <select
                      value={selectedResumeId}
                      onChange={(e) => {
                        setSelectedResumeId(e.target.value);
                        setMatchData(null);
                      }}
                      className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 max-w-[140px] truncate"
                      title="Select resume to match against this job"
                    >
                      {resumes.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.title || `${r.header?.first_name || "Resume"}'s Resume`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {!matchData ? (
                  <div className="text-center py-4 relative z-10">
                    <p className="text-sm text-slate-500 mb-4">
                      {resumes.length > 0 
                        ? `Evaluate your ${resumes.find(r => r.id === selectedResumeId)?.title || "active resume"} against this role's requirements.` 
                        : "See how well your resume matches this job description."}
                    </p>
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
                      <Button onClick={handleMatch} disabled={isMatching} variant="outline" className="w-full border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800 font-bold">
                        {isMatching ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin text-violet-600" />
                            Analyzing Resume Match...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-1.5 text-violet-600" />
                            Run AI Match
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 relative z-10 animate-in fade-in duration-300">
                    <div className="text-center p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className={`text-lg font-extrabold ${
                          matchData.score === 'Strong Match' 
                            ? 'text-emerald-600' 
                            : matchData.score === 'Good Match' 
                            ? 'text-amber-600' 
                            : 'text-rose-600'
                        }`}>
                          {matchData.score}
                        </span>
                        {typeof matchData.match_percentage === "number" && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${
                            matchData.score === 'Strong Match'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : matchData.score === 'Good Match'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {matchData.match_percentage}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{matchData.advice}</p>
                    </div>

                    {/* Matched Skills & Strengths */}
                    {matchData.matching_skills?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-emerald-700 uppercase mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Matched Skills & Strengths
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {matchData.matching_skills.map((s: string) => (
                            <Badge 
                              key={s} 
                              variant="secondary" 
                              className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 whitespace-normal h-auto text-left py-1 px-2.5 leading-snug text-[11px] font-semibold"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Skills / Recommendations */}
                    {matchData.missing_skills?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-rose-600 uppercase mb-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          Missing / Recommended Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {matchData.missing_skills.map((s: string) => (
                            <Badge 
                              key={s} 
                              variant="secondary" 
                              className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 whitespace-normal h-auto text-left py-1 px-2.5 leading-snug text-[11px] font-semibold"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs font-bold text-slate-700 hover:bg-slate-50" 
                        onClick={handleMatch} 
                        disabled={isMatching}
                      >
                        {isMatching ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1 text-violet-600" />}
                        {isMatching ? "Analyzing..." : "Re-Analyze"}
                      </Button>
                      <Button 
                        size="sm" 
                        className="w-full text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white" 
                        onClick={() => router.push("/resume")}
                      >
                        Edit Resume
                      </Button>
                    </div>
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
      </>
    )}
  </DialogContent>
</Dialog>
);
}
