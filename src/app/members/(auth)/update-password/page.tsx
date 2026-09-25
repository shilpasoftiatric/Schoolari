"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { healInvitedUserProfile } from "@/app/actions/auth";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 1. Direct custom OTP token verification if present in query params
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const type = params.get("type");

    if (token) {
      const otpType: any = type === "invite" ? "invite" : type === "signup" ? "signup" : "recovery";
      supabase.auth.verifyOtp({ token_hash: token, type: otpType }).then(({ error: verifyErr }) => {
        if (verifyErr) {
          const altType: any = otpType === "recovery" ? "invite" : "recovery";
          supabase.auth.verifyOtp({ token_hash: token, type: altType }).then(({ error: altErr }) => {
            if (altErr) {
              console.warn("OTP verification error:", altErr);
              setError("The setup link is invalid or has expired. Please ask your administrator to send a new invite.");
            }
          });
        }
        window.history.replaceState(null, "", window.location.pathname);
      });
      return;
    }

    // 2. If the invite link used implicit flow, manually extract and set the session
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
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

    const { data: updateData, error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Explicitly authenticate with the new password to establish a long-lived persistent session
    let userEmail = updateData?.user?.email;
    if (!userEmail) {
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email;
    }

    if (userEmail) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });
      if (signInErr) {
        console.warn("Auto sign-in warning after password update:", signInErr.message);
      }
    }

    // Heal the invited user's profile (fix account_type, links) and get the
    // correct redirect path (redirects to /pricing if unpaid, or dashboard/onboarding if paid).
    const { redirectTo } = await healInvitedUserProfile();
    router.push(redirectTo || "/pricing");
  };

  return (
    <div className="w-full h-full flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Set Your Password</h1>
        <p className="text-slate-500 mt-2 text-sm sm:text-base">
          Please choose a secure password to complete your account setup.
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
          {loading ? "Saving..." : "Set Password"}
        </Button>
      </form>
    </div>
  );
}
