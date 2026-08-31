"use client";

import { useState } from "react";
import { ShieldAlert, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptAiDisclaimer } from "@/app/actions/ai-disclaimer";

interface AIDisclaimerModalProps {
  isOpen: boolean;
  feature: "essay" | "resume";
  onAccepted?: () => void;
}

export function AIDisclaimerModal({ isOpen, feature, onAccepted }: AIDisclaimerModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [visible, setVisible] = useState(isOpen);

  if (!visible) return null;

  const handleAccept = async () => {
    setIsPending(true);
    try {
      await acceptAiDisclaimer(feature);
      setVisible(false);
      if (onAccepted) onAccepted();
    } catch (err) {
      console.error("Error accepting disclaimer:", err);
      // Still close locally to prevent blocking in edge cases
      setVisible(false);
      if (onAccepted) onAccepted();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[92dvh] sm:max-h-[85vh] shadow-2xl border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 sm:p-6 text-white text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-xl tracking-tight">
                AI Use & User Responsibility
              </h3>
              <p className="text-white/80 text-[11px] sm:text-xs font-medium mt-0.5">
                Important advisory for Schoolari AI-powered features
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content - Scrollable on mobile */}
        <div className="p-4 sm:p-7 space-y-3 sm:space-y-4 text-left overflow-y-auto flex-1">
          <p className="text-xs sm:text-sm text-slate-700 font-semibold leading-relaxed">
            By using Schoolari’s AI-powered features, including Essay Coach, Resume Builder, and any other AI tools, you understand and agree that:
          </p>

          <div className="space-y-2.5 sm:space-y-3.5 pt-1">
            <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                You are <strong className="text-slate-900 font-bold">solely responsible</strong> for reviewing, verifying, editing, and approving all content produced with the assistance of AI before using, submitting, or sharing it.
              </p>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Schoolari does not guarantee the accuracy, completeness, originality, or suitability of AI-generated or AI-assisted content.
              </p>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                You assume full responsibility for your final work and agree to release and hold harmless Schoolari, its owners, employees, and affiliates from claims or liability arising from your use of or reliance on AI-assisted content, to the fullest extent permitted by law.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-5 sm:px-7 border-t border-slate-100 bg-slate-50/70 flex justify-end shrink-0">
          <Button
            type="button"
            onClick={handleAccept}
            disabled={isPending}
            className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-200 transition-all cursor-pointer h-10 sm:h-auto"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "I Understand"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
