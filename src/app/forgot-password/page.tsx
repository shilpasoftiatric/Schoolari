"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Send, CheckCircle2, GraduationCap } from "lucide-react";
import { sendPasswordResetLink } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await sendPasswordResetLink(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || "Password reset link sent!");
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-100/50 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600 shadow-md shadow-violet-200">
          <GraduationCap className="w-7 h-7 text-white" />
        </div>
        <span className="text-2xl font-extrabold text-slate-900 tracking-tight">Schoolari</span>
      </div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {!success ? (
          <>
            <div className="mb-8">
              <Link href="/login" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-8 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Login
              </Link>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Forgot Password?</h1>
              <p className="text-slate-500 mt-3 text-sm sm:text-base leading-relaxed">
                Enter the email address associated with your account. We'll send you a secure link to reset your password.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <span className="text-red-400 mt-0.5">⚠</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="pl-10 h-12 rounded-xl border-slate-200 bg-white focus-visible:ring-primary"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-12 rounded-xl text-base font-bold gap-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-lg shadow-purple-200 transition-all"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <>Send Reset Link <Send className="w-4 h-4" /></>
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Check your inbox</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              {success}
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50">
                Return to Login
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
