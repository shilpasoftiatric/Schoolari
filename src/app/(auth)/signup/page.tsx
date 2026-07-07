"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail, Lock, User, Phone, ArrowRight,
  Eye, EyeOff, CheckCircle2, GraduationCap, Users,
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

    const formData = new FormData(e.currentTarget);
    formData.set("account_type", accountType);

    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message ?? "Check your email to confirm your account!");
      }
    });
  }

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Check your inbox!</h2>
          <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">{success}</p>
        </div>
        <Link href="/login">
          <Button variant="outline" className="rounded-xl">Back to Sign In</Button>
        </Link>
      </div>
    );
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
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="first_name" className="text-sm font-semibold text-slate-700">First name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="first_name"
              name="first_name"
              type="text"
              placeholder="Your first name"
              required
              className="pl-10 h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">Phone number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              required
              className="pl-10 h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-primary"
            />
          </div>
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

        {/* Terms */}
        <p className="text-xs text-slate-400 leading-relaxed">
          By creating an account, you agree to our{" "}
          <Link href="#" className="text-primary hover:underline">Terms of Service</Link>{" "}
          and{" "}
          <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-12 rounded-xl text-base font-bold gap-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-lg shadow-purple-200 transition-all"
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

      {/* Login link */}
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
