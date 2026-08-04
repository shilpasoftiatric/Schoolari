"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, ArrowRight, Loader2, CalendarClock, Zap, Star, Crown } from "lucide-react";
import { getUpgradePreview, upgradeSubscriptionPlan, scheduleSubscriptionUpgrade } from "@/app/actions/subscription";
import { PLAN_INFO, type SubscriptionPlan } from "@/lib/subscription";

interface UpgradeFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: NonNullable<SubscriptionPlan>;
  currentPlan?: SubscriptionPlan;
  featureName?: string;
}

const PLAN_ICON: Record<NonNullable<SubscriptionPlan>, React.ElementType> = {
  starter: Zap,
  scholar: Star,
  elite: Crown,
};

const PLAN_COLOR: Record<NonNullable<SubscriptionPlan>, { bg: string; text: string; ring: string }> = {
  starter: { bg: "from-blue-600 to-indigo-600", text: "text-blue-600", ring: "ring-blue-200" },
  scholar: { bg: "from-violet-600 to-purple-600", text: "text-violet-600", ring: "ring-violet-200" },
  elite: { bg: "from-amber-500 to-orange-500", text: "text-amber-600", ring: "ring-amber-200" },
};

export function UpgradeFlowModal({
  isOpen,
  onClose,
  targetPlan,
  currentPlan,
  featureName,
}: UpgradeFlowModalProps) {
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewData, setPreviewData] = useState<{ amountDue: number; nextBillingDate: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingImmediate, setIsProcessingImmediate] = useState(false);
  const [isProcessingScheduled, setIsProcessingScheduled] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const planInfo = PLAN_INFO[targetPlan];
  const color = PLAN_COLOR[targetPlan];
  const Icon = PLAN_ICON[targetPlan];

  useEffect(() => {
    if (!isOpen) return;

    const fetchPreview = async () => {
      setLoadingPreview(true);
      setError(null);
      try {
        let priceId = "";
        if (targetPlan === "starter") priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER!;
        if (targetPlan === "scholar") priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_SCHOLAR!;
        if (targetPlan === "elite") priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE!;

        const data = await getUpgradePreview(priceId);
        setPreviewData(data);
      } catch (err: any) {
        setError(err.message || "Could not fetch pricing preview.");
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();

    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, targetPlan]);

  if (!isOpen) return null;

  const handleImmediateUpgrade = async () => {
    setIsProcessingImmediate(true);
    setError(null);
    try {
      let priceId = "";
      if (targetPlan === "starter") priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER!;
      if (targetPlan === "scholar") priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_SCHOLAR!;
      if (targetPlan === "elite") priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE!;

      const result = await upgradeSubscriptionPlan(priceId);
      
      if (result.requiresPayment && 'paymentUrl' in result && result.paymentUrl) {
        window.location.href = result.paymentUrl as string;
        return;
      }

      let msg = `Successfully upgraded to ${planInfo.label}!`;
      if ('amountPaid' in result && typeof result.amountPaid === 'number') {
        if (result.amountPaid > 0) {
          msg += ` Your default payment method was automatically charged $${(result.amountPaid / 100).toFixed(2)}.`;
        } else {
          msg += ` No payment was required today due to proration credits or existing balance.`;
        }
      }
      setSuccessMessage(msg);

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Upgrade failed.");
      setIsProcessing(false);
    }
  };

  const handleScheduledUpgrade = async () => {
    setIsProcessingScheduled(true);
    setError(null);
    try {
      let priceId = "";
      if (targetPlan === "starter") priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER!;
      if (targetPlan === "scholar") priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_SCHOLAR!;
      if (targetPlan === "elite") priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE!;

      const result = await scheduleSubscriptionUpgrade(priceId);
      
      if (result?.error) {
        setError(result.error);
        setIsProcessingScheduled(false);
        return;
      }

      setSuccessMessage(`Your plan will automatically upgrade to ${planInfo.label} on your next billing date.`);
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 3500);
    } catch (err: any) {
      setError(err.message || "Failed to schedule upgrade.");
    } finally {
      setIsProcessingScheduled(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 h-[100dvh] w-screen">
      <div className="absolute inset-0 w-full h-full bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`bg-gradient-to-br ${color.bg} px-6 pt-8 pb-8 relative shrink-0`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center ring-4 ring-white/30">
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              {featureName && <p className="text-white/80 text-sm font-medium mb-0.5">Unlock {featureName}</p>}
              <h2 className="text-2xl font-extrabold text-white leading-tight">Upgrade to {planInfo.label}</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {successMessage ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Upgrade Confirmed</h3>
              <p className="text-slate-600">{successMessage}</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-bold text-slate-800 mb-3">What you get:</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {planInfo.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${color.text}`} />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              {loadingPreview ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm">Calculating your prorated upgrade price...</p>
                </div>
              ) : previewData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Immediate */}
                  <div className="border-2 border-slate-100 rounded-2xl p-5 hover:border-violet-200 transition-colors bg-slate-50 relative">
                    <div className="absolute -top-3 left-4 bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full">Option 1</div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1 mt-1">Upgrade Today</h4>
                    <p className="text-sm text-slate-500 mb-4 h-10">Start using {planInfo.label} features right now.</p>
                    
                    <div className="bg-white rounded-xl p-3 mb-4 shadow-sm text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-500">Prorated Amount Due:</span>
                        <span className="font-bold text-slate-800">${(previewData.amountDue / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-3">
                        <span className="text-slate-500">Then monthly:</span>
                        <span className="font-semibold text-slate-700">{planInfo.price}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-snug">
                        * Unlock {planInfo.label} today by paying only today's upgrade amount. Your subscription will automatically renew at {planInfo.price} starting from your next billing date on <strong className="text-slate-700">{new Date(previewData.nextBillingDate).toLocaleDateString()}</strong>.
                      </p>
                    </div>

                    <button
                      onClick={handleImmediateUpgrade}
                      disabled={isProcessingImmediate || isProcessingScheduled}
                      className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${color.bg} text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all`}
                    >
                      {isProcessingImmediate ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Pay ${(previewData.amountDue / 100).toFixed(2)} Now
                    </button>
                  </div>

                  {/* Option 2: Next Cycle */}
                  <div className="border-2 border-slate-100 rounded-2xl p-5 hover:border-blue-200 transition-colors bg-slate-50 relative">
                    <div className="absolute -top-3 left-4 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">Option 2</div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1 mt-1">Upgrade Next Cycle</h4>
                    <p className="text-sm text-slate-500 mb-4 h-10">Keep your current plan until renewal.</p>

                    <div className="bg-white rounded-xl p-3 mb-4 shadow-sm text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-500">Amount Due Today:</span>
                        <span className="font-bold text-slate-800">$0.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Starts On:</span>
                        <span className="font-semibold text-slate-700">
                          {new Date(previewData.nextBillingDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleScheduledUpgrade}
                      disabled={isProcessingImmediate || isProcessingScheduled}
                      className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3 rounded-xl transition-all"
                    >
                      {isProcessingScheduled ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
                      Schedule Upgrade
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function setIsProcessing(arg0: boolean) {
    throw new Error("Function not implemented.");
}

