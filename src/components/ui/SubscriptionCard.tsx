"use client";

import { useState } from "react";
import { CreditCard, CheckCircle2, Zap, Star, Crown, ArrowRight, AlertCircle, Calendar, BadgeCheck } from "lucide-react";
import { UpgradeFlowModal } from "@/components/ui/UpgradeFlowModal";
import type { SubscriptionPlan } from "@/lib/subscription";
import { PLAN_INFO } from "@/lib/subscription";

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  status: string | null;
  renewalDate: string | null;
  hasSubscription: boolean;
}

const PLAN_ICON: Record<NonNullable<SubscriptionPlan>, React.ElementType> = {
  starter: Zap,
  scholar: Star,
  elite: Crown,
};

const PLAN_COLOR: Record<
  NonNullable<SubscriptionPlan>,
  { gradient: string; text: string; badge: string; button: string; ring: string }
> = {
  starter: {
    gradient: "from-blue-50 to-indigo-50",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    button: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200",
    ring: "ring-blue-200",
  },
  scholar: {
    gradient: "from-violet-50 to-purple-50",
    text: "text-violet-700",
    badge: "bg-violet-100 text-violet-700",
    button: "from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-violet-200",
    ring: "ring-violet-200",
  },
  elite: {
    gradient: "from-amber-50 to-orange-50",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    button: "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-200",
    ring: "ring-amber-200",
  },
};

const UPGRADES: Record<NonNullable<SubscriptionPlan>, NonNullable<SubscriptionPlan>[]> = {
  starter: ["scholar", "elite"],
  scholar: ["elite"],
  elite: [],
};

const PRICE_ID_MAP: Record<NonNullable<SubscriptionPlan>, string> = {
  starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "",
  scholar: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCHOLAR || "",
  elite: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || "",
};

export function SubscriptionCard({ plan, status, renewalDate, hasSubscription }: SubscriptionCardProps) {
  const [targetUpgradePlan, setTargetUpgradePlan] = useState<NonNullable<SubscriptionPlan> | null>(null);

  const color = plan ? PLAN_COLOR[plan] : PLAN_COLOR["starter"];
  const PlanIcon = plan ? PLAN_ICON[plan] : CreditCard;
  const upgradePlans = plan ? UPGRADES[plan] : [];

  if (!plan && !hasSubscription) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-red-700">No Active Subscription</h3>
        </div>
        <p className="text-red-600/80 text-sm mb-4">
          You don't have an active Schoolari subscription. Subscribe to unlock all features.
        </p>
        <a
          href="/pricing"
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-xl transition-colors text-sm"
        >
          View Pricing Plans
        </a>
      </div>
    );
  }

  return (
    <div id="subscription" className={`rounded-2xl bg-gradient-to-br ${color.gradient} border border-white shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-500 mb-1">Your Subscription</h3>
            <div className="flex items-center gap-2.5">
              {plan && (
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color.button.split(" hover:")[0]} flex items-center justify-center shadow-sm`}>
                  <PlanIcon className="w-4.5 h-4.5 text-white" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-extrabold ${color.text}`}>
                    {plan ? PLAN_INFO[plan].label : "Schoolari"} Plan
                  </span>
                  {status === "active" ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <BadgeCheck className="w-3 h-3" />
                      Active
                    </span>
                  ) : status === "trialing" ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                      <BadgeCheck className="w-3 h-3" />
                      Trial
                    </span>
                  ) : status === "past_due" ? (
                    <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Past Due</span>
                  ) : (
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{status}</span>
                  )}
                </div>
                <p className={`text-sm font-medium ${color.text} opacity-70`}>
                  {plan ? PLAN_INFO[plan].price : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        {renewalDate && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3">
            <Calendar className="w-3.5 h-3.5" />
            Renews on {renewalDate}
          </div>
        )}
      </div>

      {/* Features */}
      {plan && (
        <div className="px-6 pb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Included Features</p>
          <ul className="space-y-1.5">
            {PLAN_INFO[plan].features.map((feat) => (
              <li key={feat} className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${color.text}`} />
                {feat}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upgrade Options */}
      {upgradePlans.length > 0 && (
        <div className="px-6 pb-6 pt-2 border-t border-black/5 mt-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Upgrade Your Plan</p>
          <div className="space-y-2.5">
            {upgradePlans.map((targetPlan) => {
              const targetColor = PLAN_COLOR[targetPlan];
              const TargetIcon = PLAN_ICON[targetPlan];
              return (
                <button
                  key={targetPlan}
                  onClick={() => setTargetUpgradePlan(targetPlan)}
                  className={`w-full flex items-center justify-between gap-3 bg-gradient-to-r ${targetColor.button} text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg text-sm`}
                >
                  <div className="flex items-center gap-2.5">
                    <TargetIcon className="w-4 h-4 shrink-0" />
                    <div className="text-left">
                      <div className="font-extrabold leading-tight">Upgrade to {PLAN_INFO[targetPlan].label}</div>
                      <div className="text-white/80 text-xs font-normal">{PLAN_INFO[targetPlan].price}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Elite badge */}
      {plan === "elite" && (
        <div className="px-6 pb-6 pt-2 border-t border-black/5 mt-2 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-600 font-bold text-sm">
            <Crown className="w-4 h-4" />
            You're on our highest tier. Thank you! 🎉
          </div>
        </div>
      )}

      {targetUpgradePlan && (
        <UpgradeFlowModal
          isOpen={!!targetUpgradePlan}
          onClose={() => setTargetUpgradePlan(null)}
          targetPlan={targetUpgradePlan}
          currentPlan={plan ?? undefined}
        />
      )}
    </div>
  );
}
