"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, CheckCircle2, ArrowRight, Zap, Star, Crown } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/subscription";
import { PLAN_INFO } from "@/lib/subscription";
import { UpgradeFlowModal } from "./UpgradeFlowModal";

interface LockedFeaturePageProps {
  featureName: string;
  requiredPlan: NonNullable<SubscriptionPlan>;
  description?: string;
}

const PLAN_ICON: Record<NonNullable<SubscriptionPlan>, React.ElementType> = {
  starter: Zap,
  scholar: Star,
  elite: Crown,
};

const PLAN_COLOR: Record<NonNullable<SubscriptionPlan>, { bg: string; text: string; badge: string; button: string }> = {
  starter: {
    bg: "from-blue-50 to-indigo-50",
    text: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    button: "from-blue-600 to-indigo-600",
  },
  scholar: {
    bg: "from-violet-50 to-purple-50",
    text: "text-violet-600",
    badge: "bg-violet-100 text-violet-700",
    button: "from-violet-600 to-purple-600",
  },
  elite: {
    bg: "from-amber-50 to-orange-50",
    text: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    button: "from-amber-500 to-orange-500",
  },
};

export function LockedFeaturePage({
  featureName,
  requiredPlan,
  description,
}: LockedFeaturePageProps) {
  const planInfo = PLAN_INFO[requiredPlan];
  const color = PLAN_COLOR[requiredPlan];
  const PlanIcon = PLAN_ICON[requiredPlan];
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="min-h-[60vh] flex items-center justify-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-full max-w-lg">
        {/* Lock Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${color.button} flex items-center justify-center shadow-xl shadow-violet-200/60`}>
            <Lock className="w-9 h-9 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            {featureName} is Locked
          </h1>
          <p className="text-slate-500 text-lg max-w-sm mx-auto">
            {description ||
              `This feature is available on the ${planInfo.label} plan. Upgrade to unlock it instantly.`}
          </p>
        </div>

        {/* Plan Card */}
        <div className={`bg-gradient-to-br ${color.bg} border border-white rounded-3xl p-6 shadow-sm mb-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color.button} flex items-center justify-center shadow-sm`}>
              <PlanIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-extrabold text-xl ${color.text}`}>{planInfo.label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color.badge}`}>
                  {planInfo.price}
                </span>
              </div>
              <p className="text-slate-500 text-xs">Required plan to access {featureName}</p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {planInfo.features.map((feat) => (
              <li key={feat} className="flex items-center gap-2.5 text-sm text-slate-700">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${color.text}`} />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center justify-center gap-2 bg-gradient-to-r ${color.button} text-white font-bold py-3.5 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 w-full text-base`}
          >
            <ArrowRight className="w-5 h-5" />
            Upgrade to {planInfo.label} — {planInfo.price}
          </button>
          <Link
            href="/dashboard"
            className="text-sm text-center text-slate-400 hover:text-slate-600 transition-colors font-medium py-2"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
    <UpgradeFlowModal 
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      targetPlan={requiredPlan}
      featureName={featureName}
    />
    </>
  );
}
