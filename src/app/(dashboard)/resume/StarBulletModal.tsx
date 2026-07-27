"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StarBulletVariations } from "@/types/resume";
import { optimizeResumeBulletAIAction } from "@/app/actions/resume-ai";
import { Sparkles, Loader2, Check, RefreshCw, Trophy, Target, Zap } from "lucide-react";

interface StarBulletModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalBullet: string;
  roleTitle?: string;
  onApply: (optimizedBullet: string) => void;
}

export function StarBulletModal({
  isOpen,
  onClose,
  originalBullet,
  roleTitle = "Student",
  onApply
}: StarBulletModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [variations, setVariations] = useState<StarBulletVariations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<
    "actionFocused" | "metricFocused" | "leadershipFocused"
  >("actionFocused");

  const generateVariations = async () => {
    if (!originalBullet.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await optimizeResumeBulletAIAction(originalBullet, roleTitle);
      setVariations(result);
    } catch (err: any) {
      setError(err.message || "Failed to generate STAR bullet variations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && originalBullet.trim()) {
      generateVariations();
    } else {
      setVariations(null);
      setError(null);
    }
  }, [isOpen, originalBullet]);

  const handleApply = (key: "actionFocused" | "metricFocused" | "leadershipFocused") => {
    if (!variations) return;
    onApply(variations[key]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] w-full rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100/80 flex items-center justify-center text-violet-600 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900">
                AI STAR Bullet Optimizer
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Harvard ATS-optimized variations using Situation, Task, Action, and Result methodology.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="my-4 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Original Bullet
            </span>
            <p className="text-sm text-slate-700 italic">"{originalBullet}"</p>
          </div>

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600 mb-2" />
              <p className="text-sm font-bold text-slate-700">
                Crafting Harvard STAR variations with Claude Sonnet 4.6...
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Injecting US action verbs and quantifiable impact frameworks
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
              <p className="text-xs font-bold text-red-600 mb-2">{error}</p>
              <Button
                onClick={generateVariations}
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
              </Button>
            </div>
          )}

          {!loading && variations && (
            <div className="space-y-3">
              {/* Option 1: Action Focused */}
              <div
                onClick={() => setSelectedOption("actionFocused")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  selectedOption === "actionFocused"
                    ? "border-violet-600 bg-violet-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    <Zap className="w-3.5 h-3.5" /> Action-Oriented
                  </span>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply("actionFocused");
                    }}
                    className="h-7 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Apply
                  </Button>
                </div>
                <p className="text-sm font-medium text-slate-800">
                  {variations.actionFocused}
                </p>
              </div>

              {/* Option 2: Metric Focused */}
              <div
                onClick={() => setSelectedOption("metricFocused")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  selectedOption === "metricFocused"
                    ? "border-violet-600 bg-violet-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    <Target className="w-3.5 h-3.5" /> Metric & Impact Focused
                  </span>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply("metricFocused");
                    }}
                    className="h-7 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Apply
                  </Button>
                </div>
                <p className="text-sm font-medium text-slate-800">
                  {variations.metricFocused}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  💡 Tip: Replace bracket placeholders like [X]% with your estimated actual numbers!
                </p>
              </div>

              {/* Option 3: Leadership Focused */}
              <div
                onClick={() => setSelectedOption("leadershipFocused")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  selectedOption === "leadershipFocused"
                    ? "border-violet-600 bg-violet-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    <Trophy className="w-3.5 h-3.5" /> Leadership & Collaboration
                  </span>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply("leadershipFocused");
                    }}
                    className="h-7 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Apply
                  </Button>
                </div>
                <p className="text-sm font-medium text-slate-800">
                  {variations.leadershipFocused}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-100 pt-4">
          <Button
            variant="outline"
            onClick={generateVariations}
            disabled={loading}
            className="rounded-xl text-xs font-bold text-slate-600"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="rounded-xl text-xs font-bold text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleApply(selectedOption)}
              disabled={loading || !variations}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold"
            >
              Apply Selected Bullet
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
