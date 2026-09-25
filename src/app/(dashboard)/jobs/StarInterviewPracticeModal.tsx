"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Lightbulb,
  Copy,
  Check,
  RotateCcw,
  Save,
  Trophy,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { evaluateStarInterviewAnswerAction } from "@/app/actions/career-ai";
import { StarEvaluationResult, StarPracticeEntry, StarAnswerPayload } from "@/types/interview";

export interface StarInterviewPracticeViewProps {
  jobTitle: string;
  employerName: string;
  question: {
    id: string;
    question: string;
    type?: string;
    tip?: string;
  };
  initialPracticeEntry?: StarPracticeEntry | null;
  onBack: () => void;
  onSavePractice: (entry: StarPracticeEntry) => Promise<void> | void;
}

const STAR_SECTIONS = [
  {
    key: "situation" as const,
    letter: "S",
    label: "Situation",
    hint: "Context & setting (1–2 sentences)",
    badgeBg: "bg-purple-100 text-purple-700",
    placeholder: "e.g. During my junior year robotics project, our team had 2 weeks before the state finals when our primary motor sensor malfunctioned...",
    rows: 3,
    minHeight: "min-h-[75px]",
  },
  {
    key: "task" as const,
    letter: "T",
    label: "Task",
    hint: "Your specific responsibility",
    badgeBg: "bg-blue-100 text-blue-700",
    placeholder: "e.g. As lead programmer, it was my direct responsibility to diagnose the hardware-software communication failure and rebuild the telemetry code...",
    rows: 3,
    minHeight: "min-h-[75px]",
  },
  {
    key: "action" as const,
    letter: "A",
    label: "Action",
    hint: "Exact steps YOU took & tools used",
    badgeBg: "bg-emerald-100 text-emerald-700",
    placeholder: "e.g. I isolated the signal wires using a multimeter, rewrote the C++ sensor loop to filter out noise, and held nightly testing sessions with the drive team...",
    rows: 4,
    minHeight: "min-h-[95px]",
  },
  {
    key: "result" as const,
    letter: "R",
    label: "Result",
    hint: "Quantifiable outcome, % gain, or lesson",
    badgeBg: "bg-amber-100 text-amber-700",
    placeholder: "e.g. We restored full autonomous functionality 4 days ahead of schedule, ranked 2nd out of 45 schools, and I learned how to debug under high pressure...",
    rows: 4,
    minHeight: "min-h-[95px]",
  },
] as const;

function getScoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-600 border-emerald-200";
  if (score >= 65) return "bg-amber-50 text-amber-600 border-amber-200";
  return "bg-rose-50 text-rose-600 border-rose-200";
}

export function StarInterviewPracticeView({
  jobTitle,
  employerName,
  question,
  initialPracticeEntry,
  onBack,
  onSavePractice,
}: StarInterviewPracticeViewProps) {
  const [starData, setStarData] = useState<StarAnswerPayload>({
    situation: initialPracticeEntry?.situation || "",
    task: initialPracticeEntry?.task || "",
    action: initialPracticeEntry?.action || "",
    result: initialPracticeEntry?.result || "",
  });

  const [evaluation, setEvaluation] = useState<StarEvaluationResult | null>(
    initialPracticeEntry?.evaluation || null
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const isFormComplete = Object.values(starData).every((v) => v.trim().length > 0);

  const handleResetForm = () => {
    setStarData({ situation: "", task: "", action: "", result: "" });
    setEvaluation(null);
  };

  const handleEvaluate = async () => {
    if (!isFormComplete) {
      toast.error("Please fill in all 4 STAR sections before evaluating.");
      return;
    }

    setIsEvaluating(true);
    try {
      const res = await evaluateStarInterviewAnswerAction({
        jobTitle,
        company: employerName,
        question: question.question,
        situation: starData.situation.trim(),
        task: starData.task.trim(),
        action: starData.action.trim(),
        result: starData.result.trim(),
      });

      if (res?.evaluation) {
        setEvaluation(res.evaluation);
        toast.success("AI Evaluation complete!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to evaluate answer.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const entry: StarPracticeEntry = {
        questionId: question.id,
        question: question.question,
        type: question.type || "Behavioral",
        ...starData,
        evaluation: evaluation || undefined,
        updatedAt: new Date().toISOString(),
      };
      await onSavePractice(entry);
      toast.success("Practice answer saved to your interview prep notes!");
      onBack();
    } catch (error) {
      toast.error("Failed to save practice answer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyScript = () => {
    if (!evaluation?.polished_answer) return;
    navigator.clipboard.writeText(evaluation.polished_answer);
    setCopied(true);
    toast.success("Polished spoken answer copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header with Back Button */}
      <div className="bg-white p-4 sm:px-6 sm:py-5 border-b border-slate-200 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col items-start gap-3 min-w-0 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 border-slate-200 rounded-xl px-3 py-2 flex items-center gap-1.5 shrink-0 bg-white shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Role Details</span>
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold">
                  {question.type || "Behavioral"}
                </Badge>
                <span className="text-xs text-slate-500 font-medium">
                  {employerName} • {jobTitle}
                </span>
              </div>
              <DialogTitle className="text-base sm:text-xl font-bold text-slate-900 leading-snug">
                "{question.question}"
              </DialogTitle>
              {question.tip && (
                <p className="text-xs sm:text-sm text-slate-500 flex items-start gap-1.5 pt-1">
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{question.tip}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* STAR Guidance banner */}
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 border border-purple-100 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm text-purple-900 flex items-start gap-2.5 shadow-xs">
          <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-purple-950 text-sm">Master the STAR Method:</p>
            <p className="text-purple-800/90 mt-0.5 leading-relaxed">
              Break down your answer into four structured parts. US recruiters look for personal ownership ("I", not just "we") and concrete, measurable outcomes.
            </p>
          </div>
        </div>

        {/* 4 Interactive STAR Steps in 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {STAR_SECTIONS.map((sec) => (
            <div
              key={sec.key}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all flex flex-col"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs ${sec.badgeBg}`}>
                    {sec.letter}
                  </span>
                  {sec.label}
                </label>
                <span className="text-[11px] text-slate-400">{sec.hint}</span>
              </div>
              <textarea
                value={starData[sec.key]}
                onChange={(e) => setStarData((prev) => ({ ...prev, [sec.key]: e.target.value }))}
                placeholder={sec.placeholder}
                rows={sec.rows}
                className={`w-full text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none flex-1 ${sec.minHeight}`}
              />
            </div>
          ))}
        </div>

        {/* Action Bar (Evaluate Button) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetForm}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear inputs
          </button>
          <Button
            onClick={handleEvaluate}
            disabled={isEvaluating || !isFormComplete}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md shadow-purple-500/10"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing STAR Method with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Evaluate My Answer with AI
              </>
            )}
          </Button>
        </div>

        {/* AI Feedback & Score Card */}
        {evaluation && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-purple-200 shadow-md space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Score Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg border ${getScoreBadgeClass(evaluation.score)}`}>
                  {evaluation.score}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-purple-600" /> STAR Rating: {evaluation.rating}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Based on US college & entry-level corporate interview benchmarks
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl px-5 py-2.5 shadow"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Answer to Prep Notes
              </Button>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
                <h5 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Strengths
                </h5>
                <ul className="space-y-1.5">
                  {evaluation.strengths.map((str, idx) => (
                    <li key={idx} className="text-xs text-emerald-800 leading-relaxed flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-2">
                <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-600" /> Coach Growth Tips
                </h5>
                <ul className="space-y-1.5">
                  {evaluation.improvements.map((imp, idx) => (
                    <li key={idx} className="text-xs text-amber-800 leading-relaxed flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Polished Spoken Script */}
            {evaluation.polished_answer && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Polished Verbal Delivery (~45–60 sec)
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyScript}
                    className="text-xs h-7 px-2.5 text-slate-600 hover:text-slate-900"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy Spoken Script
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic bg-white p-4 rounded-xl border border-slate-200/70 shadow-xs">
                  "{evaluation.polished_answer}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function StarInterviewPracticeModal(props: StarInterviewPracticeViewProps & { isOpen: boolean; onClose: () => void }) {
  if (!props.isOpen) return null;
  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="w-[96vw] sm:w-[95vw] md:w-[92vw] lg:w-[88vw] xl:w-[84vw] max-w-6xl h-auto max-h-[96dvh] sm:max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 rounded-2xl sm:rounded-3xl border-slate-200 shadow-2xl">
        <StarInterviewPracticeView {...props} onBack={props.onClose} />
      </DialogContent>
    </Dialog>
  );
}
