"use client";

import { useState } from "react";
import { Star, Clock, DollarSign, ExternalLink, BellRing, CheckCircle2, Trophy, Loader2, Sparkles, MapPin, GraduationCap } from "lucide-react";
import { setScholarshipAction, sendScholarshipReminder } from "@/app/actions/scholarships";
import Swal from "sweetalert2";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ScholarshipCardProps {
  scholarship: any;
  userActionStatus: string | null; // null | "Not Started" | "In Progress" | "Won"
}

export function ScholarshipCard({ scholarship, userActionStatus }: ScholarshipCardProps) {
  const [actionStatus, setActionStatus] = useState<string | null>(userActionStatus);
  const [processing, setProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetDate, setTargetDate] = useState<string>("");

  const handleAction = async (action: "will_apply" | "applied" | "won", dueDate?: string) => {
    if (processing) return;
    setProcessing(true);

    if (action === "will_apply") {
      setIsDialogOpen(false);
    }

    const STATUS_MAP = {
      will_apply: "Not Started",
      applied: "In Progress",
      won: "Won",
    };

    // Optimistic update
    const previousStatus = actionStatus;
    setActionStatus(STATUS_MAP[action]);

    try {
      await setScholarshipAction(scholarship.id, action, dueDate);

      // Send SMS reminder for "I Will Apply"
      if (action === "will_apply") {
        const smsResult = await sendScholarshipReminder(scholarship.id);
        const smsNote = smsResult.smsSent
          ? " We'll send you a reminder before the deadline."
          : "";

        Swal.fire({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 4000,
          icon: "success",
          title: `Saved to tracker!${smsNote}`,
        });
      } else if (action === "applied") {
        Swal.fire({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          icon: "success",
          title: "Marked as applied in your tracker.",
        });
      } else if (action === "won") {
        Swal.fire({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 4000,
          icon: "success",
          title: "🏆 Congratulations! Scholarship win recorded.",
        });
      }
    } catch (err: any) {
      // Rollback optimistic update on failure
      setActionStatus(previousStatus);
      Swal.fire({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        icon: "error",
        title: err.message || "Something went wrong. Please try again.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case "stem": return "bg-blue-50 text-blue-700 border-blue-200";
      case "business": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "arts and design": return "bg-pink-50 text-pink-700 border-pink-200";
      case "health and medicine": return "bg-rose-50 text-rose-700 border-rose-200";
      case "education": return "bg-amber-50 text-amber-700 border-amber-200";
      case "humanities": return "bg-violet-50 text-violet-700 border-violet-200";
      case "social sciences": return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const isWon = actionStatus === "Won";
  const isApplied = actionStatus === "In Progress" || isWon;
  const isWillApply = actionStatus === "Not Started";

  return (
    <div className={`group bg-white border rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col h-full ${
      isWon ? "border-amber-300 bg-amber-50/20" : "border-slate-200"
    }`}>
      {/* Decorative gradient blob */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Header Badges & Score */}
      <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
        <div className="flex flex-wrap gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${getCategoryColor(scholarship.category)}`}>
            {scholarship.category || "General"}
          </span>
          {scholarship.featured && !isWon && (
            <span className="flex items-center gap-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Featured
            </span>
          )}
          {isWon && (
            <span className="flex items-center gap-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm">
              <Trophy className="w-3 h-3 fill-amber-500 text-amber-500" /> Won
            </span>
          )}
        </div>
        
        {scholarship._score && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Match</span>
            <div className="flex items-center gap-1 text-emerald-600 font-extrabold text-sm">
              <Sparkles className="w-3.5 h-3.5" />
              {scholarship._score}%
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1">
        <h3 className="text-xl font-extrabold text-slate-900 leading-tight mb-1 line-clamp-2 group-hover:text-violet-700 transition-colors">
          {scholarship.name}
        </h3>
        <p className="text-sm font-semibold text-slate-600 mb-3">{scholarship.organization_name}</p>
        
        <p className="text-sm text-slate-500 line-clamp-2 mb-4">
          {scholarship.description || "No description provided."}
        </p>

        {/* Eligibility Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {scholarship.eligible_majors && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-xs font-medium text-slate-600">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate max-w-[150px]">{scholarship.eligible_majors}</span>
            </div>
          )}
          {scholarship.eligible_states && scholarship.eligible_states.toLowerCase() !== 'all' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-xs font-medium text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate max-w-[120px]">{scholarship.eligible_states}</span>
            </div>
          )}
        </div>

        {/* Why You Match */}
        {scholarship._why_match && (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 mb-6">
            <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Why You Match
            </p>
            <ul className="text-xs text-emerald-700/80 space-y-1 pl-5 list-disc">
              <li>{scholarship._why_match}</li>
            </ul>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="mt-auto relative z-10 space-y-4">
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Award</span>
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 text-emerald-600">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              {scholarship.award_amount}
            </div>
          </div>

          {scholarship.deadline && (
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deadline</span>
              <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-rose-100 text-rose-600">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                {new Date(scholarship.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
          )}
        </div>

        {/* Three-Action State Buttons */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Status</p>
          <div className="grid grid-cols-3 gap-2">

            {/* I Will Apply */}
            <button
              onClick={() => {
                if (!isApplied && !isWon) setIsDialogOpen(true);
              }}
              disabled={processing || isApplied || isWon}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all ${
                isWillApply
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200"
                  : isApplied || isWon
                  ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200"
              } ${processing ? "opacity-50 cursor-wait" : ""}`}
            >
              {processing && isWillApply ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className={`w-4 h-4 ${isWillApply ? "text-white" : ""}`} />}
              <span className="leading-tight text-center">I Will Apply</span>
              {isWillApply && !processing && <CheckCircle2 className="w-3 h-3 text-white/80" />}
            </button>

            {/* Applied */}
            <button
              onClick={() => handleAction("applied")}
              disabled={processing || isWon}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all ${
                isApplied && !isWon
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200"
                  : isWon
                  ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
              } ${processing ? "opacity-50 cursor-wait" : ""}`}
            >
              {processing && isApplied && !isWon ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className={`w-4 h-4 ${isApplied && !isWon ? "text-white" : ""}`} />}
              <span className="leading-tight text-center">Applied</span>
              {isApplied && !isWon && !processing && <CheckCircle2 className="w-3 h-3 text-white/80" />}
            </button>

            {/* Won */}
            <button
              onClick={() => handleAction("won")}
              disabled={processing}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all ${
                isWon
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
              } ${processing ? "opacity-50 cursor-wait" : ""}`}
            >
              {processing && isWon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className={`w-4 h-4 ${isWon ? "text-white" : ""}`} />}
              <span className="leading-tight text-center">Won It!</span>
              {isWon && !processing && <CheckCircle2 className="w-3 h-3 text-white/80" />}
            </button>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Tracker</DialogTitle>
              <DialogDescription>
                When do you plan to complete and submit this application? We will add it to your dashboard tasks.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block text-slate-700">Target Date</label>
              <Input 
                type="date" 
                value={targetDate} 
                onChange={(e) => setTargetDate(e.target.value)} 
                min={new Date().toISOString().split('T')[0]}
              />
              {scholarship.deadline && (
                <p className="text-xs text-slate-500 mt-2">
                  Official deadline: {new Date(scholarship.deadline).toLocaleDateString()}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={processing}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleAction("will_apply", targetDate)} 
                disabled={processing || !targetDate}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save to Tracker
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Apply Button */}
        <a
          href={scholarship.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-violet-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md group/btn"
        >
          View Application
          <ExternalLink className="w-4 h-4 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
        </a>
      </div>
    </div>
  );
}
