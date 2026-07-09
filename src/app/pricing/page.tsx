"use client";

import { useState, useEffect, Suspense } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { signOut } from "@/app/actions/auth";

const TIERS = [
  {
    name: "Starter",
    price: "$29",
    description: "The get started tier — low barrier to entry",
    fearSolved: `"My kid doesn't know where to even start."`,
    features: [
      "AI Scholarship Search + Tracker — finds scholarships, tracks deadlines, sends reminders",
      "AI College Match — recommends colleges based on student profile",
      "Document Vault — upload transcripts, letters of rec, resume",
      "Member Dashboard — daily tasks, goals, deadline alerts"
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
  },
  {
    name: "Scholar",
    price: "$49",
    description: "Most popular — highest conversion",
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
    description: "For parents who want someone actively helping their kid",
    fearSolved: `"I need to know someone is actually watching over my kid's progress."`,
    features: [
      "Everything in Scholar",
      "Coach / Mentor Access — weekly check-ins, guidance, accountability from a real person",
      "Direct Messaging — student can ask questions, get feedback on essays and applications",
      "Done-with-you support — VA reviews applications and gives personalized feedback"
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE,
  }
];

function PricingContent() {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const searchParams = useSearchParams();

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
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setLoadingPriceId(null);
    }
  };

  const handleLogoutClick = () => {
    Swal.fire({
      title: "Log Out?",
      text: "Would you like to sign out and return to the login screen?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, sign out",
      cancelButtonText: "Stay here",
      confirmButtonColor: "#f43f5e",
      cancelButtonColor: "#94a3b8"
    }).then(async (result) => {
      if (result.isConfirmed) {
        await signOut();
      }
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto -my-6 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-start mb-6">
        <button
          onClick={handleLogoutClick}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shadow-sm"
        >
          ← Log Out & Back to Login
        </button>
      </div>

      <div className="text-center max-w-3xl mx-auto mb-10">
        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Choose Your Plan</h2>
        <p className="mt-4 text-lg text-slate-500">
          Select the subscription tier that best fits your needs to unlock the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`group relative flex flex-col p-6 sm:p-8 rounded-3xl bg-white border transition-all duration-300 ease-out hover:-translate-y-2 ${
              tier.isPopular 
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
            
            <div className="mb-6 flex items-baseline text-5xl font-extrabold text-slate-900">
              {tier.price}
              <span className="ml-1 text-xl font-medium text-slate-500">/mo</span>
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
              <Button
                onClick={() => handleSubscribe(tier.priceId)}
                disabled={loadingPriceId === tier.priceId}
                className={`w-full h-12 rounded-xl text-base font-bold transition-all duration-300 active:scale-95 ${
                  tier.isPopular 
                    ? "bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg hover:shadow-primary/30" 
                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm hover:shadow-md hover:shadow-slate-900/20"
                }`}
              >
                {loadingPriceId === tier.priceId ? "Redirecting..." : "Get Started"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8 text-slate-500">Loading pricing options...</div>}>
      <PricingContent />
    </Suspense>
  );
}
