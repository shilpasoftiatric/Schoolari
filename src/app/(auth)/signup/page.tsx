"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, PhoneInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail, Lock, User, Phone, ArrowRight,
  Eye, EyeOff, CheckCircle2, GraduationCap, Users,
  MessageSquare, ShieldCheck, X, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

type AccountType = "student" | "parent";

export default function SignupPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("student");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [aiAssistanceAgreed, setAiAssistanceAgreed] = useState(false);
  const [smsConsentAgreed, setSmsConsentAgreed] = useState(false);
  const [showSmsTermsModal, setShowSmsTermsModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showSmsTermsModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showSmsTermsModal]);

  const passwordStrength = (() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-emerald-500"][passwordStrength];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!aiAssistanceAgreed) {
      setError("You must acknowledge and agree that Schoolari’s AI tools provide assistance only before creating an account.");
      return;
    }

    if (!smsConsentAgreed) {
      setError("You must agree to the SMS communication consent before creating an account.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("account_type", accountType);

    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        window.location.href = result.redirectUrl || "/login";
      }
    });
  }

  return (
    <div className="space-y-7">
      {/* Heading */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900">Create your account</h2>
        <p className="text-slate-500 mt-2 text-sm">
          Join thousands of students winning scholarships daily.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          <span className="text-red-400 mt-0.5">⚠</span>
          {error}
        </div>
      )}

      {/* Account Type Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-slate-700">I am a…</Label>
        <div className="grid grid-cols-2 gap-3">
          {(["student", "parent"] as AccountType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAccountType(type)}
              className={cn(
                "flex items-center gap-2.5 p-3.5 rounded-xl border-2 text-left transition-all",
                accountType === type
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              )}
            >
              {type === "student"
                ? <GraduationCap className="w-5 h-5 shrink-0" />
                : <Users className="w-5 h-5 shrink-0" />}
              <span className="text-sm font-semibold capitalize">{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">


        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">Phone number</Label>
          <PhoneInput
            id="phone"
            name="phone"
            value={phone}
            onChange={setPhone}
            required
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="pl-10 h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Password strength bar */}
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", i <= passwordStrength ? strengthColor : "bg-slate-200")} />
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Password strength: <span className="font-semibold">{strengthLabel}</span>
              </p>
            </div>
          )}
        </div>

        {/* Required Checkbox Agreements */}
        <div className="space-y-2.5 pt-2">
          {/* Checkbox 1: AI Assistance Acknowledgment */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              id="ai_assistance_agreement"
              name="ai_assistance_agreement"
              checked={aiAssistanceAgreed}
              onChange={(e) => setAiAssistanceAgreed(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 accent-violet-600 cursor-pointer shrink-0"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              I understand that Schoolari’s AI tools provide assistance only. I am responsible for reviewing, verifying, editing, and approving my final work.
            </span>
          </label>

          {/* Checkbox 2: Twilio SMS Consent */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              id="sms_consent_agreement"
              name="sms_consent_agreement"
              checked={smsConsentAgreed}
              onChange={(e) => setSmsConsentAgreed(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 accent-violet-600 cursor-pointer shrink-0"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              By providing my phone number I agree to receive SMS messages from Schoolari including account updates, reminders, deadline alerts, and notifications. Message and data rates may apply. Reply STOP at any time to unsubscribe.{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowSmsTermsModal(true);
                }}
                className="text-violet-600 font-semibold underline hover:text-violet-700 cursor-pointer"
              >
                View our SMS Terms
              </button>
              .
            </span>
          </label>
        </div>

        {/* Terms */}
        <p className="text-xs text-slate-600 leading-relaxed">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>

        <Button
          type="submit"
          disabled={isPending || !aiAssistanceAgreed || !smsConsentAgreed}
          className="w-full h-12 rounded-xl text-base font-bold gap-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-lg shadow-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Creating account…
            </span>
          ) : (
            <>Create Account <ArrowRight className="w-4 h-4" /></>
          )}
        </Button>
      </form>

      {/* SMS Terms Modal (Mounted directly to document.body to cover 100% of viewport) */}
      {mounted && showSmsTermsModal && createPortal(
        <div className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-200 text-left flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="p-5 sm:px-6 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 via-purple-50/50 to-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-200 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">Schoolari SMS Terms</h3>
                  <p className="text-xs text-slate-500 font-medium">A2P 10DLC Messaging Program & Guidelines</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmsTermsModal(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Terms Body */}
            <div className="p-5 sm:p-6 space-y-3.5 text-xs text-slate-600 overflow-y-auto leading-relaxed">

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px]">1</span>
                  Program Description
                </div>
                <p className="text-slate-600 pl-7">
                  Schoolari SMS service provides real-time notifications, application deadline alerts, scholarship match reminders, and account security updates to enrolled students and parents.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px]">2</span>
                  Message Frequency
                </div>
                <p className="text-slate-600 pl-7">
                  Message frequency varies based on your college application timelines, scholarship deadlines, and user activity.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px]">3</span>
                  Message & Data Rates
                </div>
                <p className="text-slate-600 pl-7">
                  Standard message and data rates may apply depending on your mobile carrier and wireless plan.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                  <span className="w-5 h-5 rounded-full bg-amber-200/80 text-amber-800 flex items-center justify-center text-[10px]">4</span>
                  How to Opt-Out (Unsubscribe)
                </div>
                <p className="text-amber-800 pl-7">
                  You can cancel the SMS service at any time. Simply text <strong className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-amber-200">STOP</strong> in reply to any message. You will receive an immediate confirmation of cancellation.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px]">5</span>
                  Help & Support
                </div>
                <p className="text-slate-600 pl-7">
                  For assistance, text <strong className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">HELP</strong> to any message or contact our team at <a href="mailto:support@schoolari.com" className="text-violet-600 font-semibold underline">support@schoolari.com</a>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px]">6</span>
                  Carriers & Liability
                </div>
                <p className="text-slate-600 pl-7">
                  Mobile carriers are not liable for delayed or undelivered messages.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-violet-50/70 border border-violet-100 space-y-1">
                <div className="flex items-center gap-2 font-bold text-violet-900 text-xs">
                  <ShieldCheck className="w-4 h-4 text-violet-600" />
                  Privacy Protection
                </div>
                <p className="text-violet-800 pl-6">
                  Mobile numbers are stored securely and never sold or shared with third parties for marketing purposes.
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <Link
                href="/sms-terms"
                className="text-xs text-violet-600 font-semibold hover:text-violet-700 hover:underline flex items-center gap-1"
              >
                View Full SMS Terms Page <ExternalLink className="w-3 h-3" />
              </Link>
              <Button
                type="button"
                onClick={() => setShowSmsTermsModal(false)}
                className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white rounded-xl text-xs font-bold px-6 h-10 shadow-md shadow-violet-200 transition-all"
              >
                Got It, Thanks
              </Button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Login link */}
      <div className="space-y-4">
        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>

        {/* Legal links for compliance */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-center gap-3 text-sm text-slate-600">
          <Link href="/terms" className="hover:text-violet-600 hover:underline transition-colors">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-violet-600 hover:underline transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/sms-terms" className="hover:text-violet-600 hover:underline transition-colors">
            SMS Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
