"use client";

import { useEffect } from "react";
import { X, Zap, Lock, ArrowRight, CheckCircle2, Star, Crown } from "lucide-react";
import Link from "next/link";
import type { SubscriptionPlan } from "@/lib/subscription";
import { PLAN_INFO } from "@/lib/subscription";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  requiredPlan: NonNullable<SubscriptionPlan>;
  currentPlan: SubscriptionPlan;
}

const PLAN_ICON: Record<NonNullable<SubscriptionPlan>, React.ElementType> = {
  starter: Zap,
  scholar: Star,
  elite: Crown,
};

const PLAN_COLOR: Record<NonNullable<SubscriptionPlan>, { bg: string; ring: string; text: string; badge: string }> = {
  starter: {
    bg: "from-blue-600 to-indigo-600",
    ring: "ring-blue-200",
    text: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
  },
  scholar: {
    bg: "from-violet-600 to-purple-600",
    ring: "ring-violet-200",
    text: "text-violet-600",
    badge: "bg-violet-100 text-violet-700",
  },
  elite: {
    bg: "from-amber-500 to-orange-500",
    ring: "ring-amber-200",
    text: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
  },
};

export function UpgradeModal({
  isOpen,
  onClose,
  featureName,
  requiredPlan,
  currentPlan,
}: UpgradeModalProps) {
  const planInfo = PLAN_INFO[requiredPlan];
  const color = PLAN_COLOR[requiredPlan];
  const PlanIcon = PLAN_ICON[requiredPlan];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Upgrade to ${planInfo.label}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 z-10">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-br ${color.bg} px-8 pt-8 pb-10 relative overflow-hidden`}>
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white"
            aria-label="Close upgrade modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center ring-4 ring-white/30">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium mb-0.5">Feature Locked</p>
              <h2 className="text-2xl font-extrabold text-white leading-tight">{featureName}</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500 mb-0.5">Required Plan</p>
              <div className="flex items-center gap-2">
                <PlanIcon className={`w-4 h-4 ${color.text}`} />
                <span className={`font-bold text-lg ${color.text}`}>{planInfo.label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color.badge}`}>
                  {planInfo.price}
                </span>
              </div>
            </div>
          </div>

          <p className="text-slate-600 text-sm mb-5">
            Unlock <span className="font-semibold text-slate-800">{featureName}</span> and much more with the{" "}
            <span className={`font-bold ${color.text}`}>{planInfo.label}</span> plan.
          </p>

          <ul className="space-y-2 mb-6">
            {planInfo.features.map((feat) => (
              <li key={feat} className="flex items-center gap-2.5 text-sm text-slate-700">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${color.text}`} />
                {feat}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <Link
              href="/profile#subscription"
              onClick={onClose}
              className={`flex items-center justify-center gap-2 bg-gradient-to-r ${color.bg} text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 w-full`}
            >
              <ArrowRight className="w-4 h-4" />
              Upgrade to {planInfo.label}
            </Link>
            <button
              onClick={onClose}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors font-medium py-1"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
