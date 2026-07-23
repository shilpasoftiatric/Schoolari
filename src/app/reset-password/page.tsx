"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Lock, CheckCircle2, GraduationCap } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 1. Check if there's a token in the query params (Custom direct link bypassing Supabase redirect)
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const type = params.get("type");
    
    if (token && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' }).then(({ error }) => {
        if (error) {
          console.error("Error verifying OTP:", error);
          setError("The reset link is invalid or has expired. Please request a new one.");
        } else {
          // Clear query params to hide token
          window.history.replaceState(null, "", window.location.pathname);
        }
      });
      return;
    }

    // 2. Check if there's a hash in the URL containing a token (Standard Supabase redirect fallback)
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
          if (error) console.error("Error setting session:", error);
          // Clear hash to hide sensitive tokens from URL
          window.history.replaceState(null, "", window.location.pathname);
        });
      }
    }
  }, [supabase]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      // Automatically redirect to login after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  };

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
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Lock className="w-7 h-7 text-violet-600" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Reset Password</h1>
              <p className="text-slate-500 mt-3 text-sm sm:text-base leading-relaxed">
                Please enter a new, secure password for your account.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex gap-2">
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-base font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-md shadow-violet-200"
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-emerald-900 mb-3">Password Updated Successfully</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Your password has been changed successfully. You can now sign in using your new password.
            </p>
            <Button onClick={() => router.push("/login")} variant="outline" className="w-full h-12 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50">
              Go to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
