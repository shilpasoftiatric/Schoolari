"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldAlert } from "lucide-react";

export default function AdminLoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.append("isAdminLogin", "true"); // We can pass a flag to the action

    startTransition(async () => {
      const result = await signIn(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-slate-700" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900">Admin sign in</h2>
        <p className="text-slate-500 mt-2 text-sm">
          Sign in to manage scholarships and platform settings
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          <span className="text-red-400 mt-0.5">⚠</span>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
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
              placeholder="admin@schoolari.com"
              required
              autoComplete="email"
              className="pl-10 h-12 rounded-xl border-slate-200 bg-white focus-visible:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password
            </Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="pl-10 pr-10 h-12 rounded-xl border-slate-200 bg-white focus-visible:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-12 rounded-xl text-base font-bold gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-lg transition-all"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
              Signing in…
            </span>
          ) : (
            <>Sign In <ArrowRight className="w-4 h-4" /></>
          )}
        </Button>
      </form>

      {/* User login link */}
      <div className="space-y-3 pt-4">
        <p className="text-center text-sm text-slate-500">
          Student or member?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            User sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
