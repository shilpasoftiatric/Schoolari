"use client";

import { useState, useEffect } from "react";
import { Check, CheckCircle2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import Swal from "@/lib/swal";
import { validateDiscountCode, claimDiscountPlan } from "@/app/actions/discount";

const TIERS = [
  {
    name: "Starter",
    price: "$29",
    description: "Basic College Prep Solutions",
    fearSolved: `"My kid doesn't know where to even start."`,
    features: [
      "AI Scholarship Search + Tracker — finds scholarships, tracks deadlines, sends reminders",
      "AI College Match — recommends colleges based on student profile",
      "Document Vault — upload transcripts, letters of rec, resume",
      "Member Dashboard — daily tasks, goals, deadline alerts",
      "AI Essay Workspace (Limited Usage) — brainstorm and review essays"
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
  },
  {
    name: "Scholar",
    price: "$49",
    description: "Most popular — Full Solution Service",
    fearSolved: `"My kid needs help writing essays and I can't afford a $200/hr counselor."`,
    features: [
      "Everything in Starter",
      "AI Essay Help — brainstorm, review, rewrite, polish",
      "Resume Builder — academic resume, activity list, internship-ready",
      "Jobs + Internships — curated opportunities matched to student profile",
      "Earn Income Videos — entrepreneurship, side hustles, student business ideas"
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCHOLAR,
    isPopular: true,
  },
  {
    name: "Elite",
    price: "$99",
    description: "For parents who want someone actively helping their Student",
    fearSolved: `"I need to know someone is actively watching over my kid's progress."`,
    features: [
      "Everything in Scholar",
      "Coach / Mentor Access — weekly check-ins, guidance, accountability from a real person",
      "Direct Messaging — student can ask questions, get feedback on essays and applications",
      "Done-with-you support — Coach reviews applications and gives personalized feedback"
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE,
  }
];

export default function PricingClient({ hasHadTrial }: { hasHadTrial: boolean }) {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Discount Code & Referral modal states
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountStep, setDiscountStep] = useState<"code" | "referral">("code");
  const [discountCode, setDiscountCode] = useState("");
  const [discountValid, setDiscountValid] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState("");

  const [referralFirstName, setReferralFirstName] = useState("");
  const [referralLastName, setReferralLastName] = useState("");
  const [referralPhone, setReferralPhone] = useState("");
  const [referralEmail, setReferralEmail] = useState("");
  const [claimingPlan, setClaimingPlan] = useState(false);

  // Calculate the trial end date (7 days from now)
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);
  const formattedTrialDate = trialEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      Swal.fire({
        title: "Payment Failed",
        text: "Your payment was cancelled or failed. Please try again to unlock the platform.",
        icon: "error",
        confirmButtonColor: "#f43f5e",
      });
      window.history.replaceState(null, "", "/pricing");
    }
  }, [searchParams]);

  const handleSubscribe = async (priceId: string | undefined) => {
    if (!priceId) {
      Swal.fire({
        title: "Configuration Error",
        text: "Price ID not configured yet in .env.local",
        icon: "warning",
      });
      return;
    }
    setLoadingPriceId(priceId);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.assign(data.url);
      } else {
        Swal.fire({ title: "Checkout Error", text: data.error || "Failed to create checkout session", icon: "error", confirmButtonColor: "#4f46e5" });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ title: "Error", text: "Something went wrong", icon: "error", confirmButtonColor: "#4f46e5" });
    } finally {
      setLoadingPriceId(null);
    }
  };

  const handleOpenDiscountModal = () => {
    setCodeError("");
    if (discountValid) {
      setDiscountStep("referral");
    } else {
      setDiscountStep("code");
    }
    setIsDiscountModalOpen(true);
  };

  const handleApplyDiscountCode = async () => {
    if (!discountCode.trim()) {
      setCodeError("Please enter a code");
      return;
    }
    setValidatingCode(true);
    setCodeError("");
    try {
      const res = await validateDiscountCode(discountCode.trim());
      if (res.valid) {
        setDiscountValid(true);
        setDiscountStep("referral");
        setCodeError("");
      } else {
        setDiscountValid(false);
        setCodeError(res.reason || "Invalid or inactive code.");
      }
    } catch {
      setCodeError("Failed to validate code. Please try again.");
    } finally {
      setValidatingCode(false);
    }
  };

  const isReferralValid =
    referralFirstName.trim().length > 0 &&
    referralLastName.trim().length > 0 &&
    referralPhone.replace(/\D/g, "").length >= 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(referralEmail.trim());

  const handleClaimDiscount = async () => {
    if (!isReferralValid) return;

    setClaimingPlan(true);
    try {
      const res = await claimDiscountPlan({
        code: discountCode.trim(),
        firstName: referralFirstName.trim(),
        lastName: referralLastName.trim(),
        phone: referralPhone.trim(),
        email: referralEmail.trim(),
      });

      if (res.success) {
        setIsDiscountModalOpen(false);
        await Swal.fire({
          title: "Starter Plan Unlocked!",
          text: "Your free Starter access has been activated successfully. Welcome to Schoolari!",
          icon: "success",
          confirmButtonColor: "#10b981",
        });
        window.location.assign("/onboarding");
      } else {
        Swal.fire({
          title: "Could Not Activate Plan",
          text: res.error || "Please check your details and try again.",
          icon: "error",
          confirmButtonColor: "#f43f5e",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      Swal.fire({
        title: "Error",
        text: msg,
        icon: "error",
        confirmButtonColor: "#f43f5e",
      });
    } finally {
      setClaimingPlan(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto -my-6 sm:px-6 lg:px-8 py-8">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Choose Your Plan</h2>
        <p className="mt-4 text-lg text-slate-500">
          Select the subscription tier that best fits your needs to unlock the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {TIERS.map((tier) => {
          const isStarter = tier.name === "Starter";

          return (
            <div
              key={tier.name}
              className={`group relative flex flex-col p-6 sm:p-8 rounded-3xl bg-white border transition-all duration-300 ease-out hover:-translate-y-2 ${tier.isPopular
                ? "border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20 scale-100 md:scale-105 z-10 hover:shadow-2xl hover:shadow-primary/20"
                : "border-slate-200 shadow-sm hover:shadow-xl hover:border-primary/30 hover:z-20"
                }`}
            >
              {tier.isPopular && (
                <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-1/2">
                  <span className="bg-primary text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6 transition-transform duration-300 group-hover:translate-x-1">
                <h3 className="text-2xl font-bold text-slate-900">{tier.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{tier.description}</p>
              </div>

              {/* Price Display */}
              <div className="mb-6 flex items-baseline text-5xl font-extrabold text-slate-900">
                {isStarter && discountValid ? (
                  <>
                    <span className="text-emerald-600 line-through text-3xl mr-2 text-slate-400">$29</span>
                    <span className="text-emerald-600">$0</span>
                    <span className="ml-2 text-lg font-bold text-emerald-600">/ Free</span>
                  </>
                ) : (
                  <>
                    {tier.price}
                    <span className="ml-1 text-xl font-medium text-slate-500">/mo</span>
                  </>
                )}
              </div>

              <div className="mb-6 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm italic text-amber-800 transition-colors duration-300 group-hover:bg-amber-100/50">
                {tier.fearSolved}
              </div>

              <ul className="flex-1 space-y-4 mb-8">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mr-3 transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-sm text-slate-600 text-left">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {isStarter && discountValid ? (
                  <>
                    <Button
                      onClick={handleOpenDiscountModal}
                      className="w-full h-12 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-300 active:scale-95 cursor-pointer"
                    >
                      Claim Free Starter Access
                    </Button>
                    <p className="mt-3 text-xs text-center text-emerald-700 font-semibold cursor-pointer" onClick={handleOpenDiscountModal}>
                      Code <span className="font-bold font-mono">{discountCode}</span> applied — Click to submit referral
                    </p>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => handleSubscribe(tier.priceId)}
                      disabled={loadingPriceId === tier.priceId}
                      className={`w-full h-12 rounded-xl text-base font-bold transition-all duration-300 active:scale-95 ${tier.isPopular
                        ? "bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg hover:shadow-primary/30"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm hover:shadow-md hover:shadow-slate-900/20"
                        }`}
                    >
                      {loadingPriceId === tier.priceId ? "Redirecting..." : (hasHadTrial ? "Get Started" : "Start Free Trial")}
                    </Button>
                    {!hasHadTrial && (
                      <p className="mt-3 text-xs text-center text-slate-500">
                        7 days free — No charge until {formattedTrialDate}. Cancel anytime.
                      </p>
                    )}
                    {isStarter && (
                      <div className="mt-3 text-center">
                        <button
                          type="button"
                          onClick={handleOpenDiscountModal}
                          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors underline cursor-pointer"
                        >
                          Have a discount code?
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Discount Code & Referral Form Modal Dialog */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsDiscountModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {discountStep === "code" ? (
              /* STEP 1: Enter Discount Code Popup */
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Have a Discount Code?</h3>
                    <p className="text-xs text-slate-500">
                      Enter your code to unlock the Starter plan for $0.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Promotional Code
                    </label>
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value);
                        setCodeError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyDiscountCode();
                        }
                      }}
                      placeholder="e.g. STARTERFREE"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm uppercase tracking-wider font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
                      autoFocus
                    />
                    {codeError && (
                      <p className="text-xs text-rose-600 font-medium mt-1.5">{codeError}</p>
                    )}
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsDiscountModalOpen(false)}
                      className="flex-1 h-11 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <Button
                      type="button"
                      onClick={handleApplyDiscountCode}
                      disabled={validatingCode || !discountCode.trim()}
                      className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {validatingCode ? "Validating..." : "Apply Code"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: Referral Info Form Popup */
              <div className="space-y-4">
                <div className="border-b border-emerald-100 pb-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm uppercase tracking-wide">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Code Applied: {discountCode.trim().toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    To claim your free Starter plan, tell us who referred you to Schoolari:
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Referral First Name *
                    </label>
                    <input
                      type="text"
                      value={referralFirstName}
                      onChange={(e) => setReferralFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Referral Last Name *
                    </label>
                    <input
                      type="text"
                      value={referralLastName}
                      onChange={(e) => setReferralLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Referral Phone Number *
                    </label>
                    <PhoneInput
                      value={referralPhone}
                      onChange={setReferralPhone}
                      defaultCountry="US"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Referral Email Address *
                    </label>
                    <input
                      type="email"
                      value={referralEmail}
                      onChange={(e) => setReferralEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleClaimDiscount}
                    disabled={claimingPlan || !isReferralValid}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
                  >
                    {claimingPlan ? "Activating Free Access..." : "Claim Free Starter Access"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

